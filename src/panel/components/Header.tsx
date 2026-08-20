import React from 'react';
import { useSessionStore } from '../store/useSessionStore';

export const Header: React.FC = () => {
  const { connected } = useSessionStore();

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
          <span
            className={`hs-status-pill ${connected ? 'hs-status-online' : 'hs-status-offline'}`}
            title={connected ? 'Сайт hireseeker.ru подключен' : 'Откройте hireseeker.ru в браузере'}
          >
            <span className="hs-status-dot" />
            {connected ? 'Сайт активен' : 'Ожидание вкладки'}
          </span>
        </div>
      </div>
    </header>
  );
};
