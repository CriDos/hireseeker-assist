import React, { useMemo } from 'react';
import { useVacanciesStore } from '../../store/useVacanciesStore';
import { useSessionStore } from '../../store/useSessionStore';
import { searchVacancies } from '../../../core/search';
import { extractSnippet } from '../../../core/text';
import {
  IconSearch,
  IconClose,
  IconEmptyInbox,
  IconBuilding,
  IconMapPin,
  IconRefresh
} from '../Icons';

export const SearchTab: React.FC = () => {
  const vacancies = useVacanciesStore(s => s.vacancies);
  const searchQuery = useVacanciesStore(s => s.searchQuery);
  const setSearchQuery = useVacanciesStore(s => s.setSearchQuery);
  const loading = useVacanciesStore(s => s.loading);
  const syncProgress = useVacanciesStore(s => s.syncProgress);
  const syncFromPage = useVacanciesStore(s => s.syncFromPage);
  const { totalFound } = useSessionStore();

  // Instant full-text search in real-time
  const filtered = useMemo(() => {
    return searchVacancies(vacancies, searchQuery);
  }, [vacancies, searchQuery]);

  const serverTotal = Math.max(totalFound || 0, vacancies.length);
  const serverFiltered = Math.max(0, serverTotal - vacancies.length);
  const localFiltered = Math.max(0, vacancies.length - filtered.length);
  const isSearching = searchQuery.trim().length > 0;
  const isSyncing = loading || Boolean(syncProgress?.inProgress);
  const showFilterFlow = serverFiltered > 0 || (isSearching && localFiltered > 0);

  return (
    <div className="hs-tab-content hs-search-tab">
      {/* Stats Flow Bar (Найдено -> Отфильтровано -> Показано) & Refresh Action on Top */}
      <div className="hs-stats-flow-container">
        <div className="hs-stats-flow">
          <span className="hs-stat-flow-item">
            Найдено <strong>{serverTotal}</strong>
          </span>

          {showFilterFlow && (
            <>
              <span className="hs-flow-arrow">→</span>
              <span className="hs-stat-flow-item">
                Отфильтровано{' '}
                <strong>
                  {serverFiltered > 0 ? serverFiltered : ''}
                  {isSearching && localFiltered > 0 ? (
                    <span className="hs-stat-delta text-amber">
                      {serverFiltered > 0 ? ` (+${localFiltered})` : `+${localFiltered}`}
                    </span>
                  ) : null}
                </strong>
              </span>
            </>
          )}

          <span className="hs-flow-arrow">→</span>
          <span className="hs-stat-flow-item hs-stat-highlight">
            Показано{' '}
            <strong>
              {filtered.length}
              {isSearching && localFiltered > 0 ? (
                <span className="hs-stat-delta text-danger"> (-{localFiltered})</span>
              ) : null}
            </strong>
          </span>
        </div>

        <div className="hs-actions-group">
          <button
            type="button"
            className={`hs-btn-secondary hs-btn-xs hs-btn-icon ${isSyncing ? 'hs-btn-loading' : ''}`}
            onClick={() => syncFromPage()}
            title={isSyncing ? 'Синхронизация с API...' : 'Обновить вакансии'}
            disabled={isSyncing}
          >
            <IconRefresh size={12} className={isSyncing ? 'hs-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="hs-search-bar-wrap">
        <div className="hs-search-input-box">
          <IconSearch className="hs-search-icon" size={15} />
          <input
            type="text"
            className="hs-search-input"
            placeholder="Поиск по вакансиям (стек, должность, компания, описание)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="hs-search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Очистить поисковый запрос"
            >
              <IconClose size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Direct Vacancy Cards List */}
      <div className="hs-vacancies-list">
        {filtered.length === 0 ? (
          <div className="hs-empty-state">
            <IconEmptyInbox className="hs-empty-icon" size={40} />
            <h3>{vacancies.length === 0 ? 'Вакансии не загружены' : 'Ничего не найдено'}</h3>
            <p>
              {vacancies.length === 0
                ? 'Выберите профессию и фильтры на сайте hireseeker.ru и нажмите кнопку «Обновить» для загрузки списка.'
                : isSearching
                  ? `По запросу «${searchQuery}» совпадений не найдено. Попробуйте изменить ключевые слова.`
                  : 'Нет вакансий, соответствующих текущему фильтру.'}
            </p>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="hs-vacancy-card">
              <div className="hs-card-top">
                <a
                  href={item.href || `https://hireseeker.ru/vacancy/${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hs-vacancy-title"
                >
                  {item.title}
                </a>
                {item.source && <span className="hs-source-badge">{item.source}</span>}
              </div>

              <div className="hs-card-sub">
                {item.company && (
                  <span className="hs-meta-item">
                    <IconBuilding size={12} className="hs-meta-icon" />
                    <span>{item.company}</span>
                  </span>
                )}
                {item.area && (
                  <span className="hs-meta-item">
                    <IconMapPin size={12} className="hs-meta-icon" />
                    <span>{item.area}</span>
                  </span>
                )}
              </div>

              <div className="hs-card-badges">
                {item.salary && <span className="hs-badge-salary">{item.salary}</span>}
                {item.schedule && <span className="hs-badge-pill">{item.schedule}</span>}
                {item.experience && <span className="hs-badge-pill">{item.experience}</span>}
              </div>

              {/* AI Score Badge if present */}
              {item.aiScore !== undefined && (
                <div
                  className={`hs-ai-score-card-pill ${
                    item.aiMatch && item.aiScore >= 75
                      ? 'hs-score-high'
                      : item.aiMatch && item.aiScore >= 50
                        ? 'hs-score-mid'
                        : 'hs-score-low'
                  }`}
                >
                  <div className="hs-score-chip">AI: {item.aiScore}%</div>
                  <div className="hs-score-reason">{item.aiReason}</div>
                </div>
              )}

              {/* Skills */}
              {item.skills && item.skills.length > 0 && (
                <div className="hs-card-skills">
                  {item.skills.slice(0, 8).map((skill, idx) => (
                    <span key={idx} className="hs-skill-tag">
                      {skill}
                    </span>
                  ))}
                  {item.skills.length > 8 && (
                    <span className="hs-skill-tag hs-skill-more">+{item.skills.length - 8}</span>
                  )}
                </div>
              )}

              {/* Description Snippet */}
              {item.description && (
                <p
                  className="hs-card-snippet"
                  dangerouslySetInnerHTML={{
                    __html: extractSnippet(item.description, searchQuery ? [searchQuery] : [], 180)
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
