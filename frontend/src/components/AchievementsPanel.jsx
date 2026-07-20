import './AchievementsPanel.css';

// Horizontal progression timeline — earned badges glow with the brand
// gradient, locked ones sit flat in --surface-3 until unlocked.
function AchievementsPanel({ achievements }) {
  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="achievements-panel">
      <div className="achievements-header">
        <h3>🏆 Achievements</h3>
        <span className="achievements-count">
          {earnedCount}/{achievements.length}
        </span>
      </div>

      <div className="achievements-timeline">
        {achievements.map((a) => (
          <div key={a.id} className={`achievement-node ${a.earned ? 'earned' : 'locked'}`} title={a.description}>
            <div className="achievement-badge">{a.earned ? a.icon : '🔒'}</div>
            <p className="achievement-title">{a.title}</p>
            {a.earned && a.earnedDate && (
              <p className="achievement-date">{new Date(a.earnedDate).toLocaleDateString()}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AchievementsPanel;
