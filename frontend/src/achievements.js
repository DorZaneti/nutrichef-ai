// Declarative achievement badges. Each test(entries, stats) runs against the
// full activity log and the stats already computed by useActivity.

function dailyCookedTotals(entries) {
  const cooked = entries.filter((e) => e.action === 'cooked' && e.calories != null);
  const byDate = new Map();
  for (const e of cooked) {
    const day = byDate.get(e.date) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    day.calories += e.calories || 0;
    day.protein += e.protein || 0;
    day.carbs += e.carbs || 0;
    day.fat += e.fat || 0;
    byDate.set(e.date, day);
  }
  return [...byDate.values()];
}

// Loose macro-split check — not a strict nutrition target, just "reasonably balanced."
function isBalancedDay(day) {
  if (!day.calories) return false;
  const proteinPct = (day.protein * 4) / day.calories;
  const carbsPct = (day.carbs * 4) / day.calories;
  const fatPct = (day.fat * 9) / day.calories;
  return proteinPct >= 0.15 && proteinPct <= 0.35 && carbsPct >= 0.35 && carbsPct <= 0.55 && fatPct >= 0.2 && fatPct <= 0.35;
}

const ACHIEVEMENTS = [
  {
    id: 'first_cook',
    icon: '🍳',
    title: 'First Cook',
    description: 'Cook your very first recipe.',
    test: (entries) => entries.some((e) => e.action === 'cooked'),
  },
  {
    id: 'explorer_10',
    icon: '🔍',
    title: 'Curious Cook',
    description: 'Explore 10 different recipes.',
    test: (entries, stats) => stats.explored >= 10,
  },
  {
    id: 'explorer_25',
    icon: '🧭',
    title: 'Recipe Explorer',
    description: 'Explore 25 different recipes.',
    test: (entries, stats) => stats.explored >= 25,
  },
  {
    id: 'explorer_50',
    icon: '🗺️',
    title: 'Kitchen Adventurer',
    description: 'Explore 50 different recipes.',
    test: (entries, stats) => stats.explored >= 50,
  },
  {
    id: 'streak_7',
    icon: '🔥',
    title: 'Week-Long Habit',
    description: 'Keep a 7-day activity streak.',
    test: (entries, stats) => stats.streak >= 7,
  },
  {
    id: 'streak_30',
    icon: '🌟',
    title: 'Monthly Momentum',
    description: 'Keep a 30-day activity streak.',
    test: (entries, stats) => stats.streak >= 30,
  },
  {
    id: 'chef_10',
    icon: '👨‍🍳',
    title: 'Home Chef',
    description: 'Cook 10 recipes.',
    test: (entries, stats) => stats.cooked >= 10,
  },
  {
    id: 'balanced_day',
    icon: '⚖️',
    title: 'Balanced Plate',
    description: "Hit a well-balanced macro split in a single day's cooking.",
    test: (entries) => dailyCookedTotals(entries).some(isBalancedDay),
  },
];

export default ACHIEVEMENTS;
