// Curated quest templates inspired by Solo Leveling / Jin-Woo's training
export const QUEST_TEMPLATES = [
  // Strength
  { id: 'q1', name: '100 Push-ups', type: 'strength', target: 100, unit: 'reps', xp: 60, statType: 'strength', icon: '💪' },
  { id: 'q2', name: '50 Pull-ups', type: 'strength', target: 50, unit: 'reps', xp: 70, statType: 'strength', icon: '💪' },
  { id: 'q3', name: '150 Dips', type: 'strength', target: 150, unit: 'reps', xp: 65, statType: 'strength', icon: '💪' },
  { id: 'q4', name: '200 Squats', type: 'strength', target: 200, unit: 'reps', xp: 60, statType: 'strength', icon: '💪' },
  { id: 'q5', name: '100 Burpees', type: 'strength', target: 100, unit: 'reps', xp: 80, statType: 'strength', icon: '💪' },
  { id: 'q6', name: '50 Diamond Push-ups', type: 'strength', target: 50, unit: 'reps', xp: 55, statType: 'strength', icon: '💪' },
  // Cardio / Agility
  { id: 'q7', name: '10km Run', type: 'cardio', target: 10, unit: 'km', xp: 90, statType: 'cardio', icon: '⚡' },
  { id: 'q8', name: '5km Sprint', type: 'cardio', target: 5, unit: 'km', xp: 70, statType: 'cardio', icon: '⚡' },
  { id: 'q9', name: '20km Cycle', type: 'cardio', target: 20, unit: 'km', xp: 85, statType: 'cardio', icon: '⚡' },
  { id: 'q10', name: '30-min HIIT', type: 'cardio', target: 30, unit: 'minutes', xp: 75, statType: 'cardio', icon: '⚡' },
  // Endurance
  { id: 'q11', name: '200 Sit-ups', type: 'endurance', target: 200, unit: 'reps', xp: 65, statType: 'endurance', icon: '🛡' },
  { id: 'q12', name: '3-min Plank', type: 'endurance', target: 3, unit: 'minutes', xp: 60, statType: 'endurance', icon: '🛡' },
  { id: 'q13', name: '5-min Plank', type: 'endurance', target: 5, unit: 'minutes', xp: 85, statType: 'endurance', icon: '🛡' },
  { id: 'q14', name: '100 Leg Raises', type: 'endurance', target: 100, unit: 'reps', xp: 60, statType: 'endurance', icon: '🛡' },
  { id: 'q15', name: '60-min Walk', type: 'endurance', target: 60, unit: 'minutes', xp: 50, statType: 'endurance', icon: '🛡' },
  // Flexibility
  { id: 'q16', name: '20-min Stretching', type: 'flexibility', target: 20, unit: 'minutes', xp: 40, statType: 'flexibility', icon: '🌀' },
  { id: 'q17', name: '15-min Yoga Flow', type: 'flexibility', target: 15, unit: 'minutes', xp: 45, statType: 'flexibility', icon: '🌀' },
  // Vitality / Rest
  { id: 'q18', name: 'Log 8h Sleep', type: 'rest', target: 8, unit: 'hours', xp: 40, statType: 'rest', icon: '🌙' },
  { id: 'q19', name: '10-min Meditation', type: 'rest', target: 10, unit: 'minutes', xp: 35, statType: 'rest', icon: '🌙' },
];

// Penalty quest multipliers — significantly harder
export const PENALTY_MULTIPLIER = 2;

export const PENALTY_MESSAGES = [
  'The System does not forgive weakness.',
  'Penalty Quest initiated. Failure is not an option.',
  'You have been found lacking. Rise and prove your worth.',
  'The shadows grow impatient. Complete your duties.',
  'A Hunter who retreats is no Hunter at all.',
];

export function getRandomPenaltyMessage() {
  return PENALTY_MESSAGES[Math.floor(Math.random() * PENALTY_MESSAGES.length)];
}

export function generatePenaltyQuest(missedQuest) {
  // If the missed quest was already a penalty, carry it forward at the same
  // difficulty instead of doubling again (prevents runaway targets / name stacking).
  const wasPenalty = !!missedQuest.isPenalty;
  const baseName = String(missedQuest.name || 'Quest').replace(/^\[PENALTY\]\s*/, '');
  return {
    ...missedQuest,
    id: `penalty_${missedQuest.templateId || missedQuest.id}_${Date.now()}`,
    name: `[PENALTY] ${baseName}`,
    target: wasPenalty ? missedQuest.target : Math.round(missedQuest.target * PENALTY_MULTIPLIER),
    xp: wasPenalty ? missedQuest.xp : Math.round(missedQuest.xp * 1.5),
    isPenalty: true,
    completed: false,
    progress: 0,
  };
}

export function getRandomQuests(count = 4, fitnessLevel = 'beginner') {
  const shuffled = [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
  // For beginners, favor lower XP quests
  const sorted = fitnessLevel === 'beginner'
    ? shuffled.sort((a, b) => a.xp - b.xp)
    : shuffled;
  return sorted.slice(0, count).map(q => ({
    ...q,
    id: `${q.id}_${getTodayKey()}`,
    templateId: q.id,
    completed: false,
    progress: 0,
    isPenalty: false,
  }));
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const TYPE_ICONS = {
  strength: '💪',
  cardio: '⚡',
  endurance: '🛡',
  flexibility: '🌀',
  rest: '🌙',
  other: '⚔️',
};

export function createCustomQuest({ name, type, target, unit }) {
  return {
    id: `custom_${Date.now()}`,
    templateId: null,
    name,
    type,
    target: parseInt(target) || 1,
    unit,
    xp: 50,
    statType: type,
    icon: TYPE_ICONS[type] || '⚔️',
    completed: false,
    progress: 0,
    isPenalty: false,
    isCustom: true,
  };
}

export const EXERCISE_TYPES = [
  { label: 'Strength', value: 'strength', icon: '💪' },
  { label: 'Cardio', value: 'cardio', icon: '⚡' },
  { label: 'Endurance', value: 'endurance', icon: '🛡' },
  { label: 'Flexibility', value: 'flexibility', icon: '🌀' },
  { label: 'Rest / Recovery', value: 'rest', icon: '🌙' },
  { label: 'Other', value: 'other', icon: '⚔️' },
];

export const UNIT_OPTIONS = ['reps', 'minutes', 'km', 'hours', 'sets'];
