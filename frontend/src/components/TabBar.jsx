import { useI18n } from '../i18n';
import './TabBar.css';

const TABS = [
  { id: 'kitchen', icon: '🍳' },
  { id: 'trends', icon: '📈' },
  { id: 'insights', icon: '🏆' },
];

function TabBar({ activeTab, onChange }) {
  const { t, lang } = useI18n();
  const activeIndex = Math.max(0, TABS.findIndex((tab) => tab.id === activeTab));
  // In RTL the tabs flow right-to-left, so the indicator slides the other way.
  const direction = lang === 'he' ? -1 : 1;

  return (
    <div className="tab-bar" role="tablist" aria-label={t('tabs.aria')}>
      <div
        className="tab-indicator"
        aria-hidden="true"
        style={{ transform: `translateX(${direction * activeIndex * 100}%)` }}
      />
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="tab-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span className="tab-label">{t(`tabs.${tab.id}`)}</span>
        </button>
      ))}
    </div>
  );
}

export default TabBar;
