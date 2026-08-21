import React, { useEffect, useRef, useState } from 'react';
import { useLogStore, LogFilter } from '../../store/useLogStore';
import { IconCopy, IconCheck, IconTrash, IconEmptyInbox } from '../Icons';

export const LogTab: React.FC = () => {
  const { entries, activeFilter, setFilter, clearLog, getFilteredEntries } = useLogStore();
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const filtered = getFilteredEntries();

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filtered.length]);

  const handleCopy = async () => {
    if (!filtered.length) return;
    const text = filtered.map(e => `[${e.ts}] [${e.level.toUpperCase()}] ${e.message}`).join('\n');
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
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const filterLabels: Record<LogFilter, string> = {
    all: 'Все',
    info: 'Инфо',
    warn: 'Предупр.',
    error: 'Ошибки'
  };

  return (
    <div className="hs-tab-content hs-log-tab">
      <div className="hs-log-toolbar">
        <div className="hs-filter-chips">
          {(['all', 'info', 'warn', 'error'] as LogFilter[]).map(f => (
            <button
              key={f}
              type="button"
              className={`hs-chip ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        <div className="hs-toolbar-actions">
          <button
            type="button"
            className="hs-btn-secondary hs-btn-xs hs-btn-icon"
            onClick={handleCopy}
            title={copied ? 'Скопировано в буфер' : 'Скопировать журнал'}
            disabled={!filtered.length}
          >
            {copied ? <IconCheck size={12} className="text-emerald" /> : <IconCopy size={12} />}
          </button>
          <button
            type="button"
            className="hs-btn-secondary hs-btn-xs hs-btn-icon text-danger"
            onClick={clearLog}
            title="Очистить журнал"
            disabled={!entries.length}
          >
            <IconTrash size={12} />
          </button>
        </div>
      </div>

      <div className="hs-log-console" ref={logContainerRef}>
        {!filtered.length ? (
          <div className="hs-empty-state">
            <IconEmptyInbox className="hs-empty-icon" size={32} />
            <p>
              {entries.length ? 'Нет записей с выбранным фильтром' : 'Журнал событий пока пуст'}
            </p>
          </div>
        ) : (
          filtered.map((entry, idx) => (
            <div key={idx} className={`hs-log-row hs-log-${entry.level}`}>
              <span className="hs-log-time">{entry.ts}</span>
              <span className={`hs-log-badge hs-badge-${entry.level}`}>
                {entry.level.toUpperCase()}
              </span>
              <span className="hs-log-msg">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
