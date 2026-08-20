import React, { useState, useRef, useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { PRESET_PROVIDERS } from '../../../core/models';
import { IconCheck, IconRefresh, IconEye, IconEyeOff, IconChevronDown } from '../Icons';

export const SettingsTab: React.FC = () => {
  const {
    settings,
    updateLlmConfig,
    models,
    modelsLoading,
    testingConnection,
    testStatus,
    testLlmConnection,
    fetchModelsList
  } = useSettingsStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!settings) {
    return (
      <div className="hs-tab-content">
        <p className="text-muted">Загрузка настроек...</p>
      </div>
    );
  }

  const llm = settings.llm;

  const handleProviderSelect = (providerId: string) => {
    const preset = PRESET_PROVIDERS.find(p => p.id === providerId);
    if (preset) {
      updateLlmConfig({
        provider: providerId,
        baseUrl: preset.baseUrl || llm.baseUrl
      });
    }
  };

  const handleToggleModelsDropdown = async () => {
    if (!dropdownOpen) {
      setDropdownOpen(true);
      if (models.length === 0 && !modelsLoading) {
        await fetchModelsList();
      }
    } else {
      setDropdownOpen(false);
    }
  };

  return (
    <div className="hs-tab-content hs-settings-tab">
      {/* Provider Selector & API Connection */}
      <div className="hs-card">
        <div className="hs-section-title">Подключение к LLM</div>

        <div className="hs-form-row mt-2">
          <label className="hs-label">Провайдер</label>
          <select
            className="hs-select"
            value={llm.provider || 'auto'}
            onChange={e => handleProviderSelect(e.target.value)}
          >
            {PRESET_PROVIDERS.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Base URL */}
        <div className="hs-form-row mt-2">
          <label className="hs-label">Base URL</label>
          <input
            type="text"
            className="hs-input"
            placeholder="https://api.openai.com/v1"
            value={llm.baseUrl}
            onChange={e => updateLlmConfig({ baseUrl: e.target.value })}
          />
        </div>

        {/* API Key */}
        <div className="hs-form-row mt-2">
          <label className="hs-label">API Key</label>
          <div className="hs-input-group">
            <input
              type={showApiKey ? 'text' : 'password'}
              className="hs-input"
              placeholder="sk-..."
              value={llm.apiKey}
              onChange={e => updateLlmConfig({ apiKey: e.target.value })}
            />
            <button
              type="button"
              className="hs-btn-secondary hs-btn-addon hs-btn-xs hs-btn-icon"
              onClick={() => setShowApiKey(!showApiKey)}
              title={showApiKey ? 'Скрыть ключ' : 'Показать ключ'}
            >
              {showApiKey ? <IconEyeOff size={13} /> : <IconEye size={13} />}
            </button>
          </div>
        </div>

        {/* Model and Reasoning Effort in One Row */}
        <div className="hs-form-row-2col mt-2">
          <div className="hs-form-col-model" ref={dropdownRef}>
            <label className="hs-label">Модель</label>
            <div className="hs-combobox-wrap">
              <input
                type="text"
                className="hs-input hs-combobox-input"
                placeholder="gpt-4o-mini, deepseek-chat..."
                value={llm.model}
                onChange={e => updateLlmConfig({ model: e.target.value })}
                onFocus={() => {
                  if (models.length > 0) setDropdownOpen(true);
                }}
              />
              <button
                type="button"
                className="hs-combobox-arrow-btn"
                onClick={handleToggleModelsDropdown}
                disabled={modelsLoading}
                title="Выбрать модель из списка"
              >
                {modelsLoading ? (
                  <IconRefresh size={12} className="hs-spin text-muted" />
                ) : (
                  <IconChevronDown
                    size={13}
                    className={`hs-chevron-icon ${dropdownOpen ? 'hs-chevron-open' : ''}`}
                  />
                )}
              </button>

              {dropdownOpen && (
                <div className="hs-combobox-dropdown">
                  {modelsLoading ? (
                    <div className="hs-combobox-loading">
                      <IconRefresh size={12} className="hs-spin" />
                      <span>Загрузка...</span>
                    </div>
                  ) : models.length > 0 ? (
                    <div className="hs-combobox-list">
                      {models.map(m => (
                        <button
                          key={m}
                          type="button"
                          className={`hs-combobox-item ${m === llm.model ? 'active' : ''}`}
                          onClick={() => {
                            updateLlmConfig({ model: m });
                            setDropdownOpen(false);
                          }}
                        >
                          <span className="hs-combobox-item-name">{m}</span>
                          {m === llm.model && <IconCheck size={11} className="text-emerald" />}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="hs-combobox-empty">
                      <span>Модели не найдены</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="hs-form-col-reasoning">
            <label className="hs-label">Рассуждение</label>
            <select
              className="hs-select"
              value={llm.reasoningEffort || 'none'}
              onChange={e => updateLlmConfig({ reasoningEffort: e.target.value as any })}
            >
              <option value="none">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="max">Max</option>
            </select>
          </div>
        </div>

        {/* Compact Single-line Test Connection Row */}
        <div className="hs-test-connection-row mt-2">
          <button
            type="button"
            className="hs-btn-secondary hs-btn-xs hs-test-btn"
            onClick={() => testLlmConnection()}
            disabled={testingConnection}
          >
            {testingConnection ? (
              <>
                <IconRefresh size={11} className="hs-spin" />
                <span>Проверка...</span>
              </>
            ) : (
              <>
                <IconCheck size={11} />
                <span>Проверить</span>
              </>
            )}
          </button>

          {testStatus && (
            <div
              className={`hs-test-status-badge ${
                testStatus.success ? 'hs-status-success' : 'hs-status-error'
              }`}
              title={testStatus.message}
            >
              <span className="hs-test-status-text">{testStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Performance & Batch Settings */}
      <div className="hs-card">
        <div className="hs-section-title">Параметры батчей и скорость</div>

        {/* Batch Size */}
        <div className="hs-form-row mt-2">
          <div className="hs-slider-meta">
            <label className="hs-label">Размер пачки</label>
            <span className="hs-slider-val">{llm.batchSize || 25} шт.</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            className="hs-range-slider"
            value={llm.batchSize || 25}
            onChange={e => updateLlmConfig({ batchSize: Number(e.target.value) })}
          />
        </div>

        {/* Concurrency */}
        <div className="hs-form-row mt-2">
          <div className="hs-slider-meta">
            <label className="hs-label">Параллелизм</label>
            <span className="hs-slider-val">{llm.concurrency || 3} потока</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            className="hs-range-slider"
            value={llm.concurrency || 3}
            onChange={e => updateLlmConfig({ concurrency: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
};
