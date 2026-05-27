import {
  getMonthlyGoals, addMonthlyGoal, updateMonthlyGoal, deleteMonthlyGoal,
  getHabits, addHabit, toggleHabitDate, deleteHabit,
} from './state.js';

let monthOffset = 0;
let selectedHabitDay = null;

function getMonthDate(offset) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d;
}

function monthKey(offset) {
  const d = getMonthDate(offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function monthLabel(offset) {
  const d = getMonthDate(offset);
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
  const key = monthKey(monthOffset);
  const d = getMonthDate(monthOffset);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const totalDays = daysInMonth(year, month);
  const startDow = firstWeekday(year, month);

  if (!selectedHabitDay) {
    selectedHabitDay = key + '-' + padDate(d.getDate() > totalDays ? totalDays : d.getDate());
  }

  container.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'dashboard-header monthly-header';

  const nav = document.createElement('div');
  nav.className = 'month-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'month-nav-btn';
  prevBtn.textContent = '◀';
  prevBtn.addEventListener('click', () => {
    monthOffset--;
    selectedHabitDay = null;
    renderMonthlyPlan(container);
  });
  nav.appendChild(prevBtn);

  const label = document.createElement('h1');
  label.textContent = monthLabel(monthOffset);
  nav.appendChild(label);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'month-nav-btn';
  nextBtn.textContent = '▶';
  nextBtn.addEventListener('click', () => {
    monthOffset++;
    selectedHabitDay = null;
    renderMonthlyPlan(container);
  });
  nav.appendChild(nextBtn);

  header.appendChild(nav);
  container.appendChild(header);

  const layout = document.createElement('div');
  layout.className = 'monthly-layout';

  renderGoalsSection(layout, key);
  renderHabitsSection(layout, key, year, month, totalDays, startDow);

  container.appendChild(layout);
}

/* ── Goals ── */

function renderGoalsSection(container, key) {
  const section = document.createElement('section');
  section.className = 'monthly-section monthly-goals-section';

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Цели на месяц';
  section.appendChild(title);

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
        renderMonthlyPlan(container.closest('.app-content') || container.parentElement);
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
      renderMonthlyPlan(container.closest('.app-content') || container.parentElement);
    });
    row.appendChild(delBtn);

    goalsList.appendChild(row);
  });

  section.appendChild(goalsList);

  const addForm = document.createElement('form');
  addForm.className = 'goal-add-form';
  addForm.noValidate = true;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input';
  input.placeholder = 'Новая цель...';
  input.required = true;
  input.maxLength = 200;
  addForm.appendChild(input);

  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.className = 'btn btn-primary btn-sm';
  addBtn.textContent = 'Добавить';
  addForm.appendChild(addBtn);

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) return;
    const isFirst = goals.length === 0;
    addMonthlyGoal({ title: val, month: key, isMainGoal: isFirst });
    renderMonthlyPlan(container.closest('.app-content') || container.parentElement);
  });

  section.appendChild(addForm);
  container.appendChild(section);
}

/* ── Habits ── */

function renderHabitsSection(container, key, year, month, totalDays, startDow) {
  const section = document.createElement('section');
  section.className = 'monthly-section monthly-habits-section';

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Трекер привычек';
  section.appendChild(title);

  const habits = getHabits(key);

  /* ── Calendar ── */

  const calendar = document.createElement('div');
  calendar.className = 'habit-calendar';

  const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  dayLabels.forEach((dl) => {
    const lbl = document.createElement('span');
    lbl.className = 'habit-cal-dow';
    lbl.textContent = dl;
    calendar.appendChild(lbl);
  });

  const sunStart = startDow === 0 ? 6 : startDow - 1;
  for (let i = 0; i < sunStart; i++) {
    const empty = document.createElement('span');
    empty.className = 'habit-cal-empty';
    calendar.appendChild(empty);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = key + '-' + padDate(d);
    const cell = document.createElement('span');
    cell.className = 'habit-cal-day';
    if (dateStr === selectedHabitDay) cell.classList.add('habit-cal-day-active');
    if (habits.length > 0) {
      const allDone = habits.every((h) => h.completedDates.includes(dateStr));
      const someDone = habits.some((h) => h.completedDates.includes(dateStr));
      if (allDone) cell.classList.add('habit-cal-day-all');
      else if (someDone) cell.classList.add('habit-cal-day-some');
    }
    cell.textContent = d;
    cell.dataset.date = dateStr;
    cell.addEventListener('click', () => {
      selectedHabitDay = dateStr;
      renderMonthlyPlan(container.closest('.app-content') || container.parentElement);
    });
    calendar.appendChild(cell);
  }

  section.appendChild(calendar);

  /* ── Habit list for selected day ── */

  if (habits.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'habit-empty';
    empty.textContent = 'Добавьте привычку, чтобы начать отслеживание.';
    section.appendChild(empty);
  } else {
    const dayInfo = document.createElement('div');
    dayInfo.className = 'habit-day-info';
    dayInfo.textContent = selectedHabitDay ? `Отметки на ${selectedHabitDay}` : 'Выберите день в календаре';
    section.appendChild(dayInfo);

    const list = document.createElement('div');
    list.className = 'habit-check-list';

    habits.forEach((habit) => {
      const row = document.createElement('div');
      row.className = 'habit-check-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'habit-checkbox';
      cb.checked = selectedHabitDay ? habit.completedDates.includes(selectedHabitDay) : false;
      cb.addEventListener('change', () => {
        if (selectedHabitDay) {
          toggleHabitDate(habit.id, selectedHabitDay);
          renderMonthlyPlan(container.closest('.app-content') || container.parentElement);
        }
      });
      row.appendChild(cb);

      const name = document.createElement('span');
      name.className = 'habit-check-name';
      name.textContent = habit.name;
      row.appendChild(name);

      const streak = document.createElement('span');
      streak.className = 'habit-check-streak';
      const doneCount = habit.completedDates.filter((dt) => dt.startsWith(key)).length;
      streak.textContent = `${doneCount}/${totalDays}`;
      row.appendChild(streak);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-delete';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        deleteHabit(habit.id);
        renderMonthlyPlan(container.closest('.app-content') || container.parentElement);
      });
      row.appendChild(delBtn);

      list.appendChild(row);
    });

    section.appendChild(list);
  }

  /* ── Add habit form ── */

  const addForm = document.createElement('form');
  addForm.className = 'habit-add-form';
  addForm.noValidate = true;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input';
  input.placeholder = 'Новая привычка...';
  input.required = true;
  input.maxLength = 200;
  addForm.appendChild(input);

  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.className = 'btn btn-primary btn-sm';
  addBtn.textContent = 'Добавить';
  addForm.appendChild(addBtn);

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) return;
    addHabit({ name: val, month: key });
    renderMonthlyPlan(container.closest('.app-content') || container.parentElement);
  });

  section.appendChild(addForm);
  container.appendChild(section);
}

export { renderMonthlyPlan };
