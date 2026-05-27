import { setData, initDefaultData } from './storage.js';

let state = initDefaultData();

if (!state.balance) {
  const initV = {};
  const initI = {};
  ['business', 'purpose', 'health', 'hobby', 'friends', 'family', 'kids', 'wisdom', 'work'].forEach((id) => {
    initV[id] = 5;
    initI[id] = '';
  });
  state.balance = { current: { values: initV, ideals: initI }, entries: [] };
  saveState();
}

if (!state.monthly) {
  state.monthly = { goals: [], habits: [] };
  saveState();
}

function getState() {
  return state;
}

function saveState() {
  setData(state);
}

function reloadState() {
  state = initDefaultData();
}

function getCategories() {
  return state.categories;
}

function getTasks() {
  return state.tasks;
}

function addTask(taskData) {
  const task = {
    id: 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    title: taskData.title.trim(),
    description: (taskData.description || '').trim(),
    categoryId: taskData.categoryId,
    priority: taskData.priority,
    estimatedHours: Number(taskData.estimatedHours) || 0,
    date: taskData.date || '',
    repetition: taskData.repetition || 'none',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.tasks.push(task);
  saveState();
  return task;
}

function updateTask(id, taskData) {
  const index = state.tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const updated = {
    ...state.tasks[index],
    title: taskData.title.trim(),
    description: (taskData.description || '').trim(),
    categoryId: taskData.categoryId,
    priority: taskData.priority,
    estimatedHours: Number(taskData.estimatedHours) || 0,
    date: taskData.date || '',
    repetition: taskData.repetition || 'none',
    updatedAt: new Date().toISOString(),
  };
  state.tasks[index] = updated;
  saveState();
  return updated;
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveState();
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNextDate(currentDateStr, repetition) {
  const date = new Date(currentDateStr + 'T00:00:00');
  switch (repetition) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekdays':
      do { date.setDate(date.getDate() + 1); }
      while (date.getDay() === 0 || date.getDay() === 6);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return formatDate(date);
}

function toggleTaskStatus(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return null;

  if (task.status === 'active' && task.repetition && task.repetition !== 'none') {
    task.date = task.date
      ? getNextDate(task.date, task.repetition)
      : getNextDate(formatDate(new Date()), task.repetition);
    task.updatedAt = new Date().toISOString();
    saveState();
    return task;
  }

  task.status = task.status === 'active' ? 'completed' : 'active';
  task.updatedAt = new Date().toISOString();
  saveState();
  return task;
}

function updateTaskDate(id, newDate) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return null;
  task.date = newDate;
  task.updatedAt = new Date().toISOString();
  saveState();
  return task;
}

function getBalanceState() {
  return state.balance.current;
}

function setBalanceState(data) {
  state.balance.current = data;
  saveState();
}

function getBalanceEntries() {
  return state.balance.entries || [];
}

function saveBalanceEntry(entry) {
  state.balance.entries.push(entry);
  saveState();
}

/* ── Monthly goals ── */

function getMonthlyGoals(month) {
  return (state.monthly.goals || []).filter((g) => g.month === month);
}

function addMonthlyGoal(data) {
  const goal = {
    id: 'goal-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    title: data.title.trim(),
    isMainGoal: !!data.isMainGoal,
    month: data.month,
    createdAt: new Date().toISOString(),
  };
  if (goal.isMainGoal) {
    (state.monthly.goals || []).forEach((g) => { if (g.month === goal.month) g.isMainGoal = false; });
  }
  state.monthly.goals.push(goal);
  saveState();
  return goal;
}

function updateMonthlyGoal(id, data) {
  const goal = (state.monthly.goals || []).find((g) => g.id === id);
  if (!goal) return null;
  if (data.title !== undefined) goal.title = data.title.trim();
  if (data.isMainGoal) {
    (state.monthly.goals || []).forEach((g) => { if (g.month === goal.month) g.isMainGoal = false; });
    goal.isMainGoal = true;
  }
  saveState();
  return goal;
}

function deleteMonthlyGoal(id) {
  state.monthly.goals = (state.monthly.goals || []).filter((g) => g.id !== id);
  saveState();
}

/* ── Habits ── */

function getHabits(month) {
  return (state.monthly.habits || []).filter((h) => h.month === month);
}

function addHabit(data) {
  const habit = {
    id: 'habit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    name: data.name.trim(),
    month: data.month,
    completedDates: [],
    createdAt: new Date().toISOString(),
  };
  state.monthly.habits.push(habit);
  saveState();
  return habit;
}

function toggleHabitDate(habitId, dateStr) {
  const habit = (state.monthly.habits || []).find((h) => h.id === habitId);
  if (!habit) return null;
  const idx = habit.completedDates.indexOf(dateStr);
  if (idx === -1) {
    habit.completedDates.push(dateStr);
  } else {
    habit.completedDates.splice(idx, 1);
  }
  saveState();
  return habit;
}

function deleteHabit(id) {
  state.monthly.habits = (state.monthly.habits || []).filter((h) => h.id !== id);
  saveState();
}

/* ── Categories ── */

function addCategory(name, color) {
  const cat = {
    id: 'cat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    color: color || '#b8b0a8',
    system: false,
  };
  state.categories.push(cat);
  saveState();
  return cat;
}

function deleteCategory(id) {
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return 'Категория не найдена.';
  if (cat.system) return 'Системные категории нельзя удалять.';
  if (state.tasks.some((t) => t.categoryId === id)) return 'Нельзя удалить категорию, к которой привязаны задачи.';
  state.categories = state.categories.filter((c) => c.id !== id);
  saveState();
  return null;
}

/* ── Export / Import ── */

function exportData() {
  const payload = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(state)),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'planner-backup-' + formatDate(new Date()) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

function importData(jsonStr) {
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return 'Файл повреждён: невалидный JSON.';
  }
  if (!parsed || parsed.schemaVersion !== '1.0') {
    return 'Неверная версия схемы. Ожидается schemaVersion "1.0".';
  }
  if (!parsed.data || !parsed.data.categories) {
    return 'Файл не содержит данных планировщика.';
  }
  state = parsed.data;
  setData(state);
  return null;
}

function replaceState(newState) {
  state = newState;
}

export {
  getState, saveState, reloadState, getCategories, getTasks,
  addTask, updateTask, deleteTask, toggleTaskStatus, updateTaskDate,
  getBalanceState, setBalanceState, getBalanceEntries, saveBalanceEntry,
  getMonthlyGoals, addMonthlyGoal, updateMonthlyGoal, deleteMonthlyGoal,
  getHabits, addHabit, toggleHabitDate, deleteHabit,
  addCategory, deleteCategory, exportData, importData, replaceState,
};
