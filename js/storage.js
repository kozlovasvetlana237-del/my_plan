const STORAGE_KEY = 'taskPlannerData';

const DEFAULT_SYSTEM_CATEGORIES = [
  { id: 'cat-work', name: 'Работа', color: '#8fa88b', system: true },
  { id: 'cat-home', name: 'Дом', color: '#c4a882', system: true },
  { id: 'cat-kids', name: 'Дети', color: '#b8a9c9', system: true },
  { id: 'cat-health', name: 'Здоровье', color: '#a8c4c4', system: true },
  { id: 'cat-sport', name: 'Спорт', color: '#b8c9a9', system: true },
  { id: 'cat-learning', name: 'Обучение', color: '#d4b8a8', system: true },
  { id: 'cat-personal', name: 'Личное / Отношения', color: '#d4a8b8', system: true },
];

function getData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function initDefaultData() {
  const existing = getData();
  if (existing && existing.categories && existing.categories.length > 0) {
    return existing;
  }
  const initialValues = {};
  const initialIdeals = {};
  ['business', 'purpose', 'health', 'hobby', 'friends', 'family', 'kids', 'wisdom', 'work'].forEach((id) => {
    initialValues[id] = 5;
    initialIdeals[id] = '';
  });

  const data = {
    categories: DEFAULT_SYSTEM_CATEGORIES,
    tasks: [],
    balance: {
      current: { values: initialValues, ideals: initialIdeals },
      entries: [],
    },
    monthly: {
      goals: [],
      habits: [],
    },
  };
  setData(data);
  return data;
}

export { getData, setData, initDefaultData };
