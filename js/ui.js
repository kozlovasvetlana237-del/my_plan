import {
  getCategories, getTasks, addTask, updateTask, deleteTask, toggleTaskStatus, updateTaskDate,
} from './state.js';

let editingTaskId = null;

let filterCategory = '';
let filterPriority = '';
let filterOverdueOnly = false;
let filterHideCompleted = false;

let weekOffset = 0;
let selectedDayDate = null;

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function getFilters() {
  return {
    categoryId: filterCategory,
    priority: filterPriority,
    overdueOnly: filterOverdueOnly,
    hideCompleted: filterHideCompleted,
  };
}

function applyFilters(tasks) {
  const f = getFilters();
  if (f.categoryId) tasks = tasks.filter((t) => t.categoryId === f.categoryId);
  if (f.priority) tasks = tasks.filter((t) => t.priority === f.priority);
  if (f.overdueOnly) tasks = tasks.filter((t) => isOverdue(t));
  if (f.hideCompleted) tasks = tasks.filter((t) => t.status !== 'completed');
  return tasks;
}

function groupByCategory(tasks) {
  const groups = {};
  tasks.forEach((t) => {
    const key = t.categoryId || 'none';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  Object.values(groups).forEach((g) => g.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]));
  return groups;
}

function totalHours(tasks) {
  return tasks.reduce((s, t) => s + (Number(t.estimatedHours) || 0), 0);
}

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekDates(offset = 0) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const result = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const dayIndex = d.getDay();
    const nameIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    const display = `${day}.${m}`;
    result.push({ dateStr, dayName: DAY_NAMES[nameIndex], shortLabel: display, fullDate: d });
  }
  return result;
}

function weekLabel(offset) {
  const dates = getWeekDates(offset);
  return `${dates[0].shortLabel} — ${dates[6].shortLabel}`;
}

function isBeforeToday(dateStr) {
  return dateStr < todayStr();
}

function isOverdue(task) {
  return task.date && isBeforeToday(task.date) && task.status !== 'completed';
}

function renderDashboard(container) {
  container.innerHTML = '';
  editingTaskId = null;

  if (!selectedDayDate) selectedDayDate = todayStr();

  const header = document.createElement('header');
  header.className = 'dashboard-header';
  header.innerHTML = '<h1>Планировщик задач</h1>';
  container.appendChild(header);

  const layout = document.createElement('div');
  layout.className = 'dashboard-layout';

  renderSidebar(layout);
  renderMainContent(layout);

  container.appendChild(layout);
}

/* ── Sidebar ── */

function renderSidebar(container) {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';

  renderCompactForm(sidebar);
  renderWeekNav(sidebar);
  renderDayList(sidebar);

  container.appendChild(sidebar);
}

/* ── Compact form ── */

function renderCompactForm(container) {
  const section = document.createElement('section');
  section.className = 'sidebar-form-section';

  const toggle = document.createElement('button');
  toggle.className = 'sidebar-form-toggle';
  toggle.textContent = '✕ Новая задача';
  section.appendChild(toggle);

  const formWrap = document.createElement('div');
  formWrap.className = 'sidebar-form-wrap';
  formWrap.style.display = 'none';

  const form = document.createElement('form');
  form.className = 'task-form-compact';
  form.id = 'task-form';
  form.noValidate = true;

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.name = 'title';
  titleInput.className = 'form-input form-input-sm';
  titleInput.placeholder = 'Название задачи...';
  titleInput.required = true;
  titleInput.maxLength = 120;
  form.appendChild(titleInput);

  const metaRow = document.createElement('div');
  metaRow.className = 'form-meta-row';

  const catSelect = document.createElement('select');
  catSelect.name = 'categoryId';
  catSelect.className = 'form-select form-select-sm';
  getCategories().forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    catSelect.appendChild(opt);
  });
  catSelect.value = getCategories()[0]?.id || '';
  metaRow.appendChild(catSelect);

  const prioSelect = document.createElement('select');
  prioSelect.name = 'priority';
  prioSelect.className = 'form-select form-select-sm';
  [
    { value: 'low', text: 'Низкий' },
    { value: 'medium', text: 'Средний' },
    { value: 'high', text: 'Высокий' },
  ].forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.value;
    opt.textContent = p.text;
    prioSelect.appendChild(opt);
  });
  prioSelect.value = 'medium';
  metaRow.appendChild(prioSelect);

  const hoursInput = document.createElement('input');
  hoursInput.type = 'number';
  hoursInput.name = 'estimatedHours';
  hoursInput.className = 'form-input form-input-sm form-input-narrow';
  hoursInput.placeholder = 'ч';
  hoursInput.min = 0;
  hoursInput.max = 24;
  hoursInput.step = 0.5;
  metaRow.appendChild(hoursInput);

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.name = 'date';
  dateInput.className = 'form-input form-input-sm form-input-narrow';
  metaRow.appendChild(dateInput);

  const repSelect = document.createElement('select');
  repSelect.name = 'repetition';
  repSelect.className = 'form-select form-select-sm form-select-narrow';
  [
    { value: 'none', text: 'Нет' },
    { value: 'daily', text: 'Ежедн' },
    { value: 'weekdays', text: 'Раб. дни' },
    { value: 'weekly', text: 'Еженед' },
    { value: 'monthly', text: 'Ежемес' },
  ].forEach((r) => {
    const opt = document.createElement('option');
    opt.value = r.value;
    opt.textContent = r.text;
    repSelect.appendChild(opt);
  });
  metaRow.appendChild(repSelect);

  form.appendChild(metaRow);

  const descInput = document.createElement('textarea');
  descInput.name = 'description';
  descInput.className = 'form-textarea form-textarea-sm';
  descInput.placeholder = 'Описание (необязательно)';
  descInput.maxLength = 1000;
  descInput.rows = 2;
  form.appendChild(descInput);

  const btnRow = document.createElement('div');
  btnRow.className = 'form-compact-actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary btn-sm';
  submitBtn.textContent = 'Добавить';
  btnRow.appendChild(submitBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-cancel btn-sm';
  cancelBtn.textContent = 'Отмена';
  cancelBtn.style.display = 'none';
  btnRow.appendChild(cancelBtn);

  form.appendChild(btnRow);

  const errorsEl = document.createElement('div');
  errorsEl.className = 'form-errors';
  form.appendChild(errorsEl);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmit(form, errorsEl, submitBtn, cancelBtn);
  });

  cancelBtn.addEventListener('click', () => {
    resetForm(form, submitBtn, cancelBtn, errorsEl);
  });

  formWrap.appendChild(form);
  section.appendChild(formWrap);

  toggle.addEventListener('click', () => {
    const isHidden = formWrap.style.display === 'none';
    formWrap.style.display = isHidden ? 'block' : 'none';
    toggle.textContent = isHidden ? '▲ Новая задача' : '✕ Новая задача';
  });

  container.appendChild(section);
}

function handleFormSubmit(form, errorsEl, submitBtn, cancelBtn) {
  const data = {
    title: form.title.value,
    description: form.description.value,
    categoryId: form.categoryId.value,
    priority: form.priority.value,
    estimatedHours: form.estimatedHours.value,
    date: form.date.value,
    repetition: form.repetition.value,
  };
  const errors = [];
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Название не может быть пустым.');
  } else if (data.title.trim().length > 120) {
    errors.push('Название не может превышать 120 символов.');
  }
  if (data.description && data.description.length > 1000) {
    errors.push('Описание не может превышать 1000 символов.');
  }
  const hrs = Number(data.estimatedHours);
  if (data.estimatedHours !== '' && (isNaN(hrs) || hrs < 0 || hrs > 24)) {
    errors.push('Оценка в часах должна быть от 0 до 24.');
  }
  if (errors.length > 0) {
    errorsEl.innerHTML = errors.map((e) => `<div class="error-msg">${e}</div>`).join('');
    return;
  }
  errorsEl.innerHTML = '';
  if (editingTaskId) {
    updateTask(editingTaskId, data);
  } else {
    addTask(data);
  }
  resetForm(form, submitBtn, cancelBtn, errorsEl);
  reRenderAll();
}

function resetForm(form, submitBtn, cancelBtn, errorsEl) {
  form.reset();
  form.title.value = '';
  form.description.value = '';
  form.estimatedHours.value = '';
  form.date.value = '';
  form.categoryId.value = getCategories()[0]?.id || '';
  form.priority.value = 'medium';
  form.repetition.value = 'none';
  errorsEl.innerHTML = '';
  editingTaskId = null;
  submitBtn.textContent = 'Добавить';
  cancelBtn.style.display = 'none';
}

function fillFormForEdit(task) {
  const form = document.getElementById('task-form');
  form.title.value = task.title;
  form.description.value = task.description || '';
  form.categoryId.value = task.categoryId;
  form.priority.value = task.priority;
  form.estimatedHours.value = task.estimatedHours;
  form.date.value = task.date || '';
  form.repetition.value = task.repetition || 'none';
  editingTaskId = task.id;
  const submitBtn = form.querySelector('.btn-primary');
  submitBtn.textContent = 'Сохранить';
  const cancelBtn = form.querySelector('.btn-cancel');
  cancelBtn.style.display = 'inline-block';
  form.querySelector('.form-errors').innerHTML = '';
  const wrap = form.closest('.sidebar-form-wrap');
  if (wrap) wrap.style.display = 'block';
  const toggle = form.closest('.sidebar-form-section')?.querySelector('.sidebar-form-toggle');
  if (toggle) toggle.textContent = '▲ Новая задача';
}

/* ── Week nav ── */

function renderWeekNav(container) {
  const nav = document.createElement('div');
  nav.className = 'week-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'week-nav-btn';
  prevBtn.textContent = '◀';
  prevBtn.addEventListener('click', () => {
    weekOffset--;
    selectedDayDate = getWeekDates(weekOffset)[0]?.dateStr || todayStr();
    reRenderAll();
  });
  nav.appendChild(prevBtn);

  const label = document.createElement('span');
  label.className = 'week-nav-label';
  label.textContent = weekLabel(weekOffset);
  nav.appendChild(label);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'week-nav-btn';
  nextBtn.textContent = '▶';
  nextBtn.addEventListener('click', () => {
    weekOffset++;
    selectedDayDate = getWeekDates(weekOffset)[0]?.dateStr || todayStr();
    reRenderAll();
  });
  nav.appendChild(nextBtn);

  container.appendChild(nav);
}

/* ── Day list ── */

function renderDayList(container) {
  const section = document.createElement('section');
  section.className = 'sidebar-days';

  const weekDates = getWeekDates(weekOffset);
  const today = todayStr();
  const allTasks = getTasks();

  weekDates.forEach((dayInfo) => {
    const activeTasks = allTasks.filter((t) => t.date === dayInfo.dateStr && t.status !== 'completed');
    const hours = totalHours(activeTasks);
    const card = document.createElement('div');
    card.className = 'day-card';
    if (dayInfo.dateStr === selectedDayDate) card.classList.add('day-card-active');
    if (dayInfo.dateStr === today) card.classList.add('day-card-today');

    const dot = document.createElement('span');
    dot.className = 'day-card-dot';
    if (activeTasks.length > 0) dot.style.background = 'var(--accent)';
    else dot.style.background = 'var(--border)';
    card.appendChild(dot);

    const info = document.createElement('div');
    info.className = 'day-card-info';
    info.innerHTML = `
      <span class="day-card-name">${dayInfo.dayName.slice(0, 2)}</span>
      <span class="day-card-date">${dayInfo.shortLabel}</span>
    `;
    card.appendChild(info);

    const count = document.createElement('span');
    count.className = 'day-card-count';
    count.textContent = activeTasks.length > 0 ? activeTasks.length : '';
    card.appendChild(count);

    if (hours > 0) {
      const hrs = document.createElement('span');
      hrs.className = 'day-card-hours';
      hrs.textContent = `${hours}ч`;
      card.appendChild(hrs);
    }

    card.addEventListener('click', () => {
      selectedDayDate = dayInfo.dateStr;
      reRenderAll();
    });

    section.appendChild(card);
  });

  const noDateTasks = allTasks.filter((t) => !t.date && t.status !== 'completed');
  if (noDateTasks.length > 0 || selectedDayDate === '') {
    const card = document.createElement('div');
    card.className = 'day-card';
    if (selectedDayDate === '') card.classList.add('day-card-active');

    const dot = document.createElement('span');
    dot.className = 'day-card-dot';
    dot.style.background = noDateTasks.length > 0 ? 'var(--accent)' : 'var(--border)';
    card.appendChild(dot);

    const info = document.createElement('div');
    info.className = 'day-card-info';
    info.innerHTML = `
      <span class="day-card-name">Без</span>
      <span class="day-card-date">даты</span>
    `;
    card.appendChild(info);

    const count = document.createElement('span');
    count.className = 'day-card-count';
    count.textContent = noDateTasks.length > 0 ? noDateTasks.length : '';
    card.appendChild(count);

    card.addEventListener('click', () => {
      selectedDayDate = '';
      reRenderAll();
    });

    section.appendChild(card);
  }

  container.appendChild(section);
}

/* ── Main content ── */

function renderMainContent(container) {
  const main = document.createElement('main');
  main.className = 'main-content';

  renderFilterBar(main);
  renderStatsSection(main);
  renderOverdueSection(main);
  renderDayDetail(main);

  container.appendChild(main);
}

/* ── Filter bar ── */

function renderFilterBar(container) {
  const existing = container.querySelector('.filter-bar');
  if (existing) existing.remove();

  const bar = document.createElement('div');
  bar.className = 'filter-bar';

  const catSelect = document.createElement('select');
  catSelect.className = 'form-select form-select-sm';
  const catAll = document.createElement('option');
  catAll.value = '';
  catAll.textContent = 'Все категории';
  catSelect.appendChild(catAll);
  getCategories().forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    catSelect.appendChild(opt);
  });
  catSelect.value = filterCategory;
  bar.appendChild(catSelect);

  const prioSelect = document.createElement('select');
  prioSelect.className = 'form-select form-select-sm';
  const prioAll = document.createElement('option');
  prioAll.value = '';
  prioAll.textContent = 'Приоритет';
  prioSelect.appendChild(prioAll);
  ['low', 'medium', 'high'].forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }[p];
    prioSelect.appendChild(opt);
  });
  prioSelect.value = filterPriority;
  bar.appendChild(prioSelect);

  const overdueLabel = document.createElement('label');
  overdueLabel.className = 'filter-check-label';
  const overdueCheck = document.createElement('input');
  overdueCheck.type = 'checkbox';
  overdueCheck.checked = filterOverdueOnly;
  overdueLabel.appendChild(overdueCheck);
  overdueLabel.appendChild(document.createTextNode(' Просроченные'));
  bar.appendChild(overdueLabel);

  const hideLabel = document.createElement('label');
  hideLabel.className = 'filter-check-label';
  const hideCheck = document.createElement('input');
  hideCheck.type = 'checkbox';
  hideCheck.checked = filterHideCompleted;
  hideLabel.appendChild(hideCheck);
  hideLabel.appendChild(document.createTextNode(' Скрыть готовые'));
  bar.appendChild(hideLabel);

  const onChange = () => {
    filterCategory = catSelect.value;
    filterPriority = prioSelect.value;
    filterOverdueOnly = overdueCheck.checked;
    filterHideCompleted = hideCheck.checked;
    reRenderAll();
  };

  catSelect.addEventListener('change', onChange);
  prioSelect.addEventListener('change', onChange);
  overdueCheck.addEventListener('change', onChange);
  hideCheck.addEventListener('change', onChange);

  container.insertBefore(bar, container.firstChild);
}

/* ── Stats section ── */

function renderStatsSection(container) {
  const existing = container.querySelector('.stats-section');
  if (existing) existing.remove();

  const allTasks = getTasks();
  const activeTasks = allTasks.filter((t) => t.status === 'active');
  const completedTasks = allTasks.filter((t) => t.status === 'completed');
  const totalAll = activeTasks.length + completedTasks.length;
  const pct = totalAll > 0 ? Math.round((completedTasks.length / totalAll) * 100) : 0;

  const section = document.createElement('section');
  section.className = 'stats-section';

  const body = document.createElement('div');
  body.className = 'stats-body';

  const pctBlock = document.createElement('div');
  pctBlock.className = 'stat-block';
  pctBlock.innerHTML = `
    <span class="stat-value">${pct}%</span>
    <span class="stat-label">выполнения</span>
  `;
  body.appendChild(pctBlock);

  const catBlock = document.createElement('div');
  catBlock.className = 'stat-block';
  const catList = document.createElement('div');
  catList.className = 'stat-cat-list';
  getCategories().forEach((cat) => {
    const count = allTasks.filter((t) => t.categoryId === cat.id).length;
    if (count === 0) return;
    const item = document.createElement('div');
    item.className = 'stat-cat-item';
    item.innerHTML = `
      <span class="stat-cat-dot" style="background:${cat.color}"></span>
      <span class="stat-cat-name">${cat.name}</span>
      <span class="stat-cat-count">${count}</span>
    `;
    catList.appendChild(item);
  });
  catBlock.appendChild(catList);
  body.appendChild(catBlock);

  section.appendChild(body);
  container.insertBefore(section, container.querySelector('.overdue-section') || container.querySelector('.day-detail'));
}

/* ── Overdue section ── */

function renderOverdueSection(container) {
  const existing = container.querySelector('.overdue-section');
  if (existing) existing.remove();

  const tasks = applyFilters(getTasks()).filter(isOverdue);
  if (tasks.length === 0) return;

  const section = document.createElement('section');
  section.className = 'overdue-section';

  const title = document.createElement('h2');
  title.className = 'section-title overdue-title';
  title.textContent = `Просроченные (${tasks.length})`;
  section.appendChild(title);

  const list = document.createElement('div');
  list.className = 'overdue-list';
  tasks.forEach((task) => {
    list.appendChild(createTaskCard(task));
  });
  section.appendChild(list);

  container.insertBefore(section, container.querySelector('.day-detail'));
}

/* ── Day detail ── */

function renderDayDetail(container) {
  const existing = container.querySelector('.day-detail');
  if (existing) existing.remove();

  const section = document.createElement('section');
  section.className = 'day-detail';

  const weekDates = getWeekDates(weekOffset);
  const dayInfo = weekDates.find((d) => d.dateStr === selectedDayDate);
  const today = todayStr();
  const isToday = selectedDayDate === today;

  let dayLabel = 'Без даты';
  let dayFullName = 'Задачи без даты';
  if (dayInfo) {
    dayLabel = dayInfo.dayName + ', ' + dayInfo.shortLabel;
    dayFullName = dayInfo.dayName + ', ' + dayInfo.shortLabel;
  }

  const allTasks = getTasks();
  let dayTasks;
  if (selectedDayDate === '') {
    dayTasks = allTasks.filter((t) => !t.date);
  } else {
    dayTasks = allTasks.filter((t) => t.date === selectedDayDate);
  }
  dayTasks = applyFilters(dayTasks);
  const activeDayTasks = dayTasks.filter((t) => t.status !== 'completed');
  const completedDayTasks = dayTasks.filter((t) => t.status === 'completed');

  const header = document.createElement('div');
  header.className = 'day-detail-header';
  if (isToday) header.classList.add('day-detail-today');

  const titleSpan = document.createElement('h2');
  titleSpan.className = 'day-detail-title';
  titleSpan.textContent = dayFullName;
  header.appendChild(titleSpan);

  if (isToday) {
    const badge = document.createElement('span');
    badge.className = 'day-detail-badge';
    badge.textContent = 'Сегодня';
    header.appendChild(badge);
  }

  const meta = document.createElement('div');
  meta.className = 'day-detail-meta';
  const hrs = totalHours(activeDayTasks);
  if (hrs > 0) {
    const h = document.createElement('span');
    h.className = 'day-detail-hours';
    h.textContent = `${hrs}ч`;
    meta.appendChild(h);
  }
  const cnt = document.createElement('span');
  cnt.className = 'day-detail-count';
  cnt.textContent = `${activeDayTasks.length} активных`;
  meta.appendChild(cnt);
  if (completedDayTasks.length > 0) {
    const cmp = document.createElement('span');
    cmp.className = 'day-detail-completed';
    cmp.textContent = `${completedDayTasks.length} готовых`;
    meta.appendChild(cmp);
  }
  header.appendChild(meta);

  section.appendChild(header);

  const body = document.createElement('div');
  body.className = 'day-detail-body';

  if (activeDayTasks.length === 0 && completedDayTasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'day-empty';
    empty.textContent = 'Нет задач на этот день';
    body.appendChild(empty);
  } else {
    const groups = groupByCategory(activeDayTasks);
    const catMap = {};
    getCategories().forEach((c) => { catMap[c.id] = c; });

    Object.entries(groups).forEach(([catId, groupTasks]) => {
      const cat = catMap[catId];
      if (cat) {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        groupHeader.innerHTML = `
          <span class="group-dot" style="background:${cat.color}"></span>
          <span class="group-name">${cat.name}</span>
          <span class="group-count">${groupTasks.length}</span>
        `;
        body.appendChild(groupHeader);
      }
      groupTasks.forEach((task) => {
        body.appendChild(createTaskCard(task));
      });
    });

    if (completedDayTasks.length > 0) {
      const sep = document.createElement('div');
      sep.className = 'group-separator';
      body.appendChild(sep);

      const doneHeader = document.createElement('div');
      doneHeader.className = 'group-header';
      doneHeader.innerHTML = `<span class="group-name">Завершённые</span>`;
      body.appendChild(doneHeader);

      completedDayTasks.forEach((task) => {
        body.appendChild(createTaskCard(task));
      });
    }
  }

  section.appendChild(body);
  container.appendChild(section);
}

/* ── Task card ── */

function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = `task-card task-${task.status}`;
  card.dataset.id = task.id;

  const priorityLabels = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
  const category = getCategories().find((c) => c.id === task.categoryId);

  const weekDates = getWeekDates(weekOffset);
  const inWeek = weekDates.some((d) => d.dateStr === task.date);
  let dateOptions = weekDates.map((d) => {
    const sel = d.dateStr === task.date ? 'selected' : '';
    return `<option value="${d.dateStr}" ${sel}>${d.shortLabel}</option>`;
  }).join('');
  if (task.date && !inWeek) {
    dateOptions = `<option value="${task.date}" selected>${task.date}</option>` + dateOptions;
  }
  const noDateSel = !task.date ? 'selected' : '';
  dateOptions += `<option value="" ${noDateSel}>Без даты</option>`;

  card.innerHTML = `
    <div class="task-header">
      <span class="task-priority priority-${task.priority}">${priorityLabels[task.priority]}</span>
      <span class="task-status status-${task.status}">${task.status === 'active' ? 'В работе' : 'Готова'}</span>
    </div>
    <div class="task-body">
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
      <div class="task-meta">
        ${category ? `<span class="task-category" style="--cat-color:${category.color}">
          <span class="task-cat-dot" style="background:${category.color}"></span>${category.name}
        </span>` : ''}
        ${task.estimatedHours ? `<span class="task-hours">${task.estimatedHours}ч</span>` : ''}
        ${task.repetition !== 'none' ? `<span class="task-repeat">${repetitionLabel(task.repetition)}</span>` : ''}
        <select class="task-date-select" data-task-id="${task.id}">${dateOptions}</select>
      </div>
    </div>
    <div class="task-actions">
      <button class="btn btn-sm btn-toggle" data-action="toggle">${task.status === 'active' ? 'Завершить' : 'Вернуть'}</button>
      <button class="btn btn-sm btn-edit" data-action="edit">Ред</button>
      <button class="btn btn-sm btn-delete" data-action="delete">Удалить</button>
    </div>
  `;

  card.querySelector('[data-action="toggle"]').addEventListener('click', () => {
    toggleTaskStatus(task.id);
    reRenderAll();
  });

  card.querySelector('[data-action="edit"]').addEventListener('click', () => {
    fillFormForEdit(task);
  });

  card.querySelector('[data-action="delete"]').addEventListener('click', () => {
    deleteTask(task.id);
    reRenderAll();
  });

  const dateSelect = card.querySelector('.task-date-select');
  dateSelect.addEventListener('change', (e) => {
    updateTaskDate(task.id, e.target.value);
    reRenderAll();
  });

  return card;
}

/* ── Re-render ── */

function reRenderAll() {
  const app = document.getElementById('app');
  const content = app.querySelector('.app-content');
  if (!content) return;
  const grid = content.querySelector('.dashboard-layout');
  if (grid) {
    const parent = grid.parentElement;
    renderDashboard(parent);
  }
}

/* ── Helpers ── */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function repetitionLabel(val) {
  const map = {
    none: 'Нет',
    daily: 'Ежедневно',
    weekdays: 'По дням недели',
    weekly: 'Еженедельно',
    monthly: 'Ежемесячно',
  };
  return map[val] || val;
}

export { renderDashboard };
