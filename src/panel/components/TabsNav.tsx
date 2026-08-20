import React from 'react';
import { IconSearch, IconSparkles, IconLog, IconSettings } from './Icons';

export type TabId = 'search' | 'ai' | 'log' | 'settings';

interface TabsNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const TabsNav: React.FC<TabsNavProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav className="hs-tabs-nav">
      <button
        type="button"
        className={`hs-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
        onClick={() => onSelectTab('search')}
      >
        <IconSearch className="hs-tab-svg" size={13} />
        <span>Поиск</span>
      </button>

      <button
        type="button"
        className={`hs-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
        onClick={() => onSelectTab('ai')}
      >
        <IconSparkles className="hs-tab-svg" size={13} />
        <span>ИИ-Фильтр</span>
      </button>

      <button
        type="button"
        className={`hs-tab-btn ${activeTab === 'log' ? 'active' : ''}`}
        onClick={() => onSelectTab('log')}
      >
        <IconLog className="hs-tab-svg" size={13} />
        <span>Лог</span>
      </button>

      <button
        type="button"
        className={`hs-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onSelectTab('settings')}
      >
        <IconSettings className="hs-tab-svg" size={13} />
        <span>Настройки</span>
      </button>
    </nav>
  );
};
