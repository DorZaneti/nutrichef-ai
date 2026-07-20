import './TabBar.css';

const TABS = [
  { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { id: 'trends', label: 'Trends', icon: '📈' },
  { id: 'insights', label: 'Insights', icon: '💡' },
];

function TabBar({ activeTab, onChange }) {
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === activeTab));

  return (
    <div className="tab-bar" role="tablist" aria-label="Main sections">
      <div className="tab-indicator" style={{ transform: `translateX(${activeIndex * 100}%)` }} />
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default TabBar;
