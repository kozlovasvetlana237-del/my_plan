import {
  getMonthlyGoals, addMonthlyGoal, updateMonthlyGoal, deleteMonthlyGoal,
  getHabits, addHabit, toggleHabitDate, deleteHabit,
} from './state.js';

function monthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function monthLabel() {
  const d = new Date();
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function firstWeekday(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

function padDate(d) {
  return String(d).padStart(2, '0');
}

function renderMonthlyPlan(container) {
  const key = monthKey();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const totalDays = daysInMonth(year, month);
  const startDow = firstWeekday(year, month);

  container.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'dashboard-header';
  header.innerHTML = '<h1>План месяца</h1>';
  container.appendChild(header);

  const layout = document.createElement('div');
  layout.className = 'monthly-layout';

  /* ── Goals section ── */

  const goalsSection = document.createElement('section');
  goalsSection.className = 'monthly-section monthly-goals-section';

  const goalsTitle = document.createElement('h2');
  goalsTitle.className = 'section-title';
  goalsTitle.textContent = 'Цели на ' + monthLabel();
  goalsSection.appendChild(goalsTitle);

  const goalsList = document.createElement('div');
  goalsList.className = 'goals-list';

  const goals = getMonthlyGoals(key);

  goals.forEach((goal) => {
    const row = document.createElement('div');
    row.className = 'goal-row';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'main-goal-' + key;
    radio.className = 'goal-radio';
    radio.checked = goal.isMainGoal;
    radio.addEventListener('change', () => {
      if (radio.checked) {
        updateMonthlyGoal(goal.id, { isMainGoal: true });
        renderMonthlyPlan(container);
      }
    });
    row.appendChild(radio);

    const label = document.createElement('span');
    label.className = 'goal-title' + (goal.isMainGoal ? ' goal-main' : '');
    label.textContent = goal.title;
    row.appendChild(label);

    if (goal.isMainGoal) {
      const badge = document.createElement('span');
      badge.className = 'goal-badge';
      badge.textContent = 'Ключевая';
      row.appendChild(badge);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-delete goal-del';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      deleteMonthlyGoal(goal.id);
      renderMonthlyPlan(container);
    });
    row.appendChild(delBtn);

    goalsList.appendChild(row);
  });

  goalsSection.appendChild(goalsList);

  const addGoalForm = document.createElement('form');
  addGoalForm.className = 'goal-add-form';
  addGoalForm.noValidate = true;

  const goalInput = document.createElement('input');
  goalInput.type = 'text';
  goalInput.className = 'form-input';
  goalInput.placeholder = 'Новая цель на месяц...';
  goalInput.required = true;
  goalInput.maxLength = 200;
  addGoalForm.appendChild(goalInput);

  const goalAddBtn = document.createElement('button');
  goalAddBtn.type = 'submit';
  goalAddBtn.className = 'btn btn-primary btn-sm';
  goalAddBtn.textContent = 'Добавить';
  addGoalForm.appendChild(goalAddBtn);

  addGoalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = goalInput.value.trim();
    if (!val) return;
    const isFirst = goals.length === 0;
    addMonthlyGoal({ title: val, month: key, isMainGoal: isFirst });
    renderMonthlyPlan(container);
  });

  goalsSection.appendChild(addGoalForm);
  layout.appendChild(goalsSection);

  /* ── Habits section ── */

  const habitsSection = document.createElement('section');
  habitsSection.className = 'monthly-section monthly-habits-section';

  const habitsTitle = document.createElement('h2');
  habitsTitle.className = 'section-title';
  habitsTitle.textContent = 'Трекер привычек';
  habitsSection.appendChild(habitsTitle);

  const habits = getHabits(key);

  habits.forEach((habit) => {
    const block = document.createElement('div');
    block.className = 'habit-block';

    const top = document.createElement('div');
    top.className = 'habit-top';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'habit-name';
    nameSpan.textContent = habit.name;
    top.appendChild(nameSpan);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-delete';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', () => {
      deleteHabit(habit.id);
      renderMonthlyPlan(container);
    });
    top.appendChild(delBtn);

    block.appendChild(top);

    const grid = document.createElement('div');
    grid.className = 'habit-grid';

    const dayLabels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    dayLabels.forEach((dl) => {
      const lbl = document.createElement('span');
      lbl.className = 'habit-grid-dow';
      lbl.textContent = dl;
      grid.appendChild(lbl);
    });

    for (let i = 0; i < startDow; i++) {
      const empty = document.createElement('span');
      empty.className = 'habit-grid-empty';
      grid.appendChild(empty);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = key + '-' + padDate(d);
      const cell = document.createElement('span');
      cell.className = 'habit-day';
      const isComplete = habit.completedDates.includes(dateStr);
      if (isComplete) cell.classList.add('habit-day-done');
      cell.textContent = d;
      cell.dataset.date = dateStr;
      cell.addEventListener('click', () => {
        toggleHabitDate(habit.id, dateStr);
        cell.classList.toggle('habit-day-done');
      });
      grid.appendChild(cell);
    }

    block.appendChild(grid);
    habitsSection.appendChild(block);
  });

  const addHabitForm = document.createElement('form');
  addHabitForm.className = 'habit-add-form';
  addHabitForm.noValidate = true;

  const habitInput = document.createElement('input');
  habitInput.type = 'text';
  habitInput.className = 'form-input';
  habitInput.placeholder = 'Новая привычка...';
  habitInput.required = true;
  habitInput.maxLength = 200;
  addHabitForm.appendChild(habitInput);

  const habitAddBtn = document.createElement('button');
  habitAddBtn.type = 'submit';
  habitAddBtn.className = 'btn btn-primary btn-sm';
  habitAddBtn.textContent = 'Добавить';
  addHabitForm.appendChild(habitAddBtn);

  addHabitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = habitInput.value.trim();
    if (!val) return;
    addHabit({ name: val, month: key });
    renderMonthlyPlan(container);
  });

  habitsSection.appendChild(addHabitForm);
  layout.appendChild(habitsSection);

  container.appendChild(layout);
}

export { renderMonthlyPlan };