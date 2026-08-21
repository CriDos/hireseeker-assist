import React, { useState, useMemo } from 'react';
import { useAiFilterStore } from '../../store/useAiFilterStore';
import { useVacanciesStore } from '../../store/useVacanciesStore';
import { useSessionStore } from '../../store/useSessionStore';
import {
  IconSparkles,
  IconCopy,
  IconCheck,
  IconTrash,
  IconEdit,
  IconSave,
  IconPlus,
  IconBuilding,
  IconMapPin,
  IconEmptyInbox,
  IconRefresh
} from '../Icons';

export const AiFilterTab: React.FC = () => {
  const criteriaText = useAiFilterStore(s => s.criteriaText);
  const setCriteriaText = useAiFilterStore(s => s.setCriteriaText);
  const selectedPresetId = useAiFilterStore(s => s.selectedPresetId);
  const presets = useAiFilterStore(s => s.presets);
  const selectPreset = useAiFilterStore(s => s.selectPreset);
  const saveCurrentAsPreset = useAiFilterStore(s => s.saveCurrentAsPreset);
  const updatePreset = useAiFilterStore(s => s.updatePreset);
  const deletePreset = useAiFilterStore(s => s.deletePreset);
  const isRunning = useAiFilterStore(s => s.isRunning);
  const progress = useAiFilterStore(s => s.progress);
  const startAiFilter = useAiFilterStore(s => s.startAiFilter);
  const cancelAiFilter = useAiFilterStore(s => s.cancelAiFilter);
  const error = useAiFilterStore(s => s.error);

  const vacancies = useVacanciesStore(s => s.vacancies);
  const loading = useVacanciesStore(s => s.loading);
  const syncProgress = useVacanciesStore(s => s.syncProgress);
  const syncFromPage = useVacanciesStore(s => s.syncFromPage);
  const { totalFound } = useSessionStore();

  const serverTotal = Math.max(totalFound || 0, vacancies.length);
  const serverFiltered = Math.max(0, serverTotal - vacancies.length);
  const isSyncing = loading || Boolean(syncProgress?.inProgress);

  // Active preset object
  const activePreset = useMemo(() => {
    return presets.find(p => p.id === selectedPresetId) || null;
  }, [presets, selectedPresetId]);

  // Check if text is modified compared to the saved preset text
  const isModifiedFromPreset = useMemo(() => {
    if (!activePreset) return false;
    return activePreset.text.trim() !== criteriaText.trim();
  }, [activePreset, criteriaText]);

  const hasEvaluations = useMemo(() => {
    return vacancies.some(v => v.aiScore !== undefined);
  }, [vacancies]);

  // Show only evaluated matching vacancies sorted by AI score descending
  const matched = useMemo(() => {
    return vacancies
      .filter(v => v.aiScore !== undefined && v.aiMatch && (v.aiScore || 0) >= 50)
      .slice()
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
  }, [vacancies]);

  const [modalMode, setModalMode] = useState<'create' | 'rename' | null>(null);
  const [modalInput, setModalInput] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [savedNotification, setSavedNotification] = useState(false);

  const handleOpenCreateModal = () => {
    setModalInput('');
    setModalMode('create');
  };

  const handleOpenRenameModal = () => {
    if (!activePreset) return;
    setModalInput(activePreset.name || '');
    setModalMode('rename');
  };

  const handleModalSubmit = async () => {
    if (!modalInput.trim()) return;

    if (modalMode === 'create') {
      await saveCurrentAsPreset(modalInput.trim());
    } else if (modalMode === 'rename' && selectedPresetId) {
      await updatePreset(selectedPresetId, { name: modalInput.trim() });
    }

    setModalMode(null);
    setModalInput('');
  };

  const handleSaveTextChanges = async () => {
    if (!selectedPresetId) return;
    await updatePreset(selectedPresetId, { text: criteriaText });
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 1500);
  };

  const handleExport = async () => {
    if (!matched.length) return;
    const lines = matched.map(
      v =>
        `- [${v.aiScore || 0}%] ${v.title} (${v.company || 'Компания не указана'}) — ${v.salary || 'ЗП не указана'} | ${v.href || `https://hireseeker.ru/vacancy/${v.id}`}\n  ${v.aiReason || ''}`
    );
    const text = `# Результаты ИИ-фильтрации HireSeeker (${matched.length} шт.)\n\n${lines.join('\n\n')}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    } catch {}
  };

  return (
    <div className="hs-tab-content hs-ai-tab">
      {/* Stats Flow Bar (Найдено -> Отфильтровано -> Показано) & Refresh Action on Top */}
      <div className="hs-stats-flow-container">
        <div className="hs-stats-flow">
          <span className="hs-stat-flow-item">
            Найдено <strong>{serverTotal}</strong>
          </span>

          <span className="hs-flow-arrow">→</span>
          <span className="hs-stat-flow-item">
            Отфильтровано <strong>{serverFiltered}</strong>
          </span>

          <span className="hs-flow-arrow">→</span>
          <span className="hs-stat-flow-item hs-stat-highlight">
            Показано <strong>{vacancies.length}</strong>
          </span>
        </div>

        <div className="hs-actions-group">
          <button
            type="button"
            className={`hs-btn-secondary hs-btn-xs hs-btn-icon ${isSyncing ? 'hs-btn-loading' : ''}`}
            onClick={() => syncFromPage()}
            title={isSyncing ? 'Синхронизация с API...' : 'Обновить вакансии'}
            disabled={isSyncing || isRunning}
          >
            <IconRefresh size={12} className={isSyncing ? 'hs-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="hs-card hs-ai-box">
        {/* Template Toolbar */}
        <div className="hs-template-toolbar">
          <div className="hs-template-select-wrap">
            <select
              className="hs-select hs-template-select"
              value={selectedPresetId || ''}
              onChange={e => selectPreset(e.target.value || null)}
              disabled={isRunning}
            >
              <option value="">Пусто</option>
              {presets.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hs-template-actions">
            <button
              type="button"
              className="hs-btn-secondary hs-btn-xs hs-btn-icon"
              onClick={handleOpenCreateModal}
              disabled={isRunning || !criteriaText.trim()}
              title="Создать новый шаблон"
            >
              <IconPlus size={12} />
            </button>

            {selectedPresetId && (
              <>
                {isModifiedFromPreset && (
                  <button
                    type="button"
                    className="hs-btn-primary hs-btn-xs"
                    onClick={handleSaveTextChanges}
                    disabled={isRunning}
                    title="Сохранить изменения в текущий шаблон"
                  >
                    <IconSave size={11} />
                    <span>{savedNotification ? 'Сохранено' : 'Сохранить'}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="hs-btn-ghost hs-btn-xs"
                  onClick={handleOpenRenameModal}
                  disabled={isRunning}
                  title="Переименовать шаблон"
                >
                  <IconEdit size={11} />
                </button>

                <button
                  type="button"
                  className="hs-btn-ghost hs-btn-xs text-danger"
                  onClick={() => deletePreset(selectedPresetId)}
                  disabled={isRunning}
                  title="Удалить шаблон"
                >
                  <IconTrash size={11} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Criteria Textarea */}
        <textarea
          className="hs-textarea hs-ai-textarea mt-2"
          placeholder="Опишите стек, опыт, желаемый формат и стоп-факторы (например: «Python FastAPI, PostgreSQL, удаленка, без 1С/PHP, от 180k»)..."
          value={criteriaText}
          onChange={e => setCriteriaText(e.target.value)}
          disabled={isRunning}
          rows={3}
        />

        {/* Bottom Run Action Bar */}
        <div className="hs-ai-bottom-bar mt-2">
          <div className="hs-ai-status-hint">
            {isRunning && progress ? (
              <span className="hs-ai-status-text text-amber">
                <span>
                  Обработано: <strong>{progress.processed}</strong>/{progress.total}
                </span>
                {progress.matches > 0 && (
                  <span className="text-emerald font-semibold ml-1">
                    ({progress.matches} совп.)
                  </span>
                )}
              </span>
            ) : vacancies.length > 0 ? (
              <span>
                К оценке: <strong>{vacancies.length}</strong> вак.
              </span>
            ) : (
              <span className="text-amber">Вакансии не загружены</span>
            )}
          </div>

          <div className="hs-run-btns">
            {isRunning ? (
              <button
                type="button"
                className="hs-btn-danger hs-btn-xs"
                onClick={() => cancelAiFilter()}
              >
                Остановить
              </button>
            ) : (
              <button
                type="button"
                className="hs-btn-primary hs-btn-xs"
                onClick={() => startAiFilter()}
                disabled={!criteriaText.trim() || vacancies.length === 0}
              >
                <IconSparkles size={12} />
                <span>Запустить ИИ-фильтр</span>
              </button>
            )}
          </div>
        </div>

        {/* Slim progress bar inside card when running */}
        {isRunning && progress && progress.total > 0 && (
          <div className="hs-progress-track mt-1">
            <div
              className="hs-progress-fill"
              style={{
                width: `${Math.round((progress.processed / progress.total) * 100)}%`
              }}
            />
          </div>
        )}

        {error && <div className="hs-alert hs-alert-error mt-2">{error}</div>}
      </div>

      {/* Modal for Create or Rename Template */}
      {modalMode && (
        <div className="hs-modal-backdrop">
          <div className="hs-modal-dialog">
            <h4>{modalMode === 'create' ? 'Новый шаблон' : 'Переименовать шаблон'}</h4>
            <input
              type="text"
              className="hs-input"
              placeholder="Название (например: Python Senior Удаленка)"
              value={modalInput}
              onChange={e => setModalInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && modalInput.trim()) {
                  e.preventDefault();
                  void handleModalSubmit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setModalMode(null);
                }
              }}
              autoFocus
            />
            <div className="hs-modal-actions mt-3">
              <button
                type="button"
                className="hs-btn-secondary hs-btn-xs"
                onClick={() => setModalMode(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="hs-btn-primary hs-btn-xs"
                onClick={handleModalSubmit}
                disabled={!modalInput.trim()}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Header */}
      {matched.length > 0 && (
        <div className="hs-results-header">
          <div className="hs-stat-flow-item">
            Подходящих: <strong>{matched.length}</strong>
          </div>

          <button
            type="button"
            className="hs-btn-secondary hs-btn-xs"
            onClick={handleExport}
            title="Скопировать список в буфер"
          >
            {copiedNotification ? <IconCheck size={12} /> : <IconCopy size={12} />}
            <span>{copiedNotification ? 'Скопировано' : 'Экспорт'}</span>
          </button>
        </div>
      )}

      {/* Vacancies List (only matched) */}
      <div className="hs-matched-list">
        {matched.length === 0 ? (
          <div className="hs-empty-state">
            <IconEmptyInbox className="hs-empty-icon" size={36} />
            <h3>
              {vacancies.length === 0
                ? 'Вакансии не загружены'
                : hasEvaluations
                  ? 'Нет подходящих вакансий'
                  : 'Ожидание фильтрации'}
            </h3>
            <p>
              {vacancies.length === 0
                ? 'Выберите специальность на сайте hireseeker.ru и загрузите вакансии для анализа.'
                : hasEvaluations
                  ? `Нейросеть оценила вакансии (${vacancies.length} шт.), но ни одна не подошла по заданным критериям.`
                  : `Загружено вакансий: ${vacancies.length}. Задайте критерии и нажмите «Запустить ИИ-фильтр», чтобы отобрать подходящие.`}
            </p>
            {vacancies.length === 0 && (
              <button
                type="button"
                className={`hs-btn-primary hs-btn-xs mt-2 ${isSyncing ? 'hs-btn-loading' : ''}`}
                onClick={() => syncFromPage()}
                disabled={isSyncing || isRunning}
              >
                <IconRefresh size={12} className={isSyncing ? 'hs-spin' : ''} />
                <span>{isSyncing ? 'Загрузка...' : 'Загрузить вакансии'}</span>
              </button>
            )}
          </div>
        ) : (
          matched.map(item => (
            <div key={item.id} className="hs-vacancy-card hs-ai-matched-card">
              <div className="hs-card-top">
                <a
                  href={item.href || `https://hireseeker.ru/vacancy/${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hs-vacancy-title"
                >
                  {item.title}
                </a>
                <div className="hs-card-top-right">
                  {item.aiScore !== undefined ? (
                    <span
                      className={`hs-score-badge-pill ${
                        item.aiMatch && item.aiScore >= 75
                          ? 'hs-score-high'
                          : item.aiMatch && item.aiScore >= 50
                            ? 'hs-score-mid'
                            : 'hs-score-low'
                      }`}
                    >
                      AI: {item.aiScore}%
                    </span>
                  ) : item.source ? (
                    <span className="hs-source-badge">{item.source}</span>
                  ) : null}
                </div>
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

              {/* AI Reason Callout if evaluated */}
              {item.aiReason && (
                <div className="hs-ai-reason-callout">
                  <div className="hs-reason-text">{item.aiReason}</div>
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

              {/* Description Snippet if not evaluated yet */}
              {!item.aiReason && item.description && (
                <p className="hs-card-snippet">{item.description.slice(0, 180)}...</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
