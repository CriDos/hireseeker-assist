import React from 'react';
import { useSessionStore } from '../store/useSessionStore';
import { sendRpc } from '../services/extension';

export const Header: React.FC = () => {
  const { connected } = useSessionStore();

  const handlePillClick = async () => {
    if (!connected) {
      await sendRpc('OPEN_TAB');
      void useSessionStore.getState().checkStatus();
    }
  };

  return (
    <header className="hs-header">
      <div className="hs-header-brand">
        <div className="hs-logo-wrap">
          <img
            src="./assets/icons/icon32.png"
            alt="HireSeeker Assist"
            className="hs-logo-img"
            onError={e => {
              // Fallback if relative path differs
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <div className="hs-title-stack">
            <h1 className="hs-title">HireSeeker Assist</h1>
          </div>
        </div>

        <div className="hs-header-tags">
          <button
            type="button"
            className={`hs-status-pill ${connected ? 'hs-status-online' : 'hs-status-offline hs-status-clickable'}`}
            onClick={handlePillClick}
            title={
              connected
                ? 'Сайт hireseeker.ru подключен'
                : 'Нажмите, чтобы открыть сайт hireseeker.ru'
            }
          >
            <span className="hs-status-dot" />
            <span>{connected ? 'Сайт активен' : 'Открыть вкладку'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
