import {
  getCategories, getTasks, addTask, updateTask, deleteTask, toggleTaskStatus, updateTaskDate,
} from './state.js';

let editingTaskId = null;

let filterCategory = '';
let filterPriority = '';
let filterOverdueOnly = false;
let filterHideCompleted = false;

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
    const display = `${DAY_NAMES_SHORT[nameIndex]} ${day}.${m}`;
    result.push({ dateStr, dayName: DAY_NAMES[nameIndex], shortLabel: display });
  }
  return result;
}

function isBeforeToday(dateStr) {
  return dateStr < todayStr();
}

function isOverdue(task) {
  return task.date && isBeforeToday(task.date) && task.status !== 'completed';
}

/* ── Main render ── */

function renderDashboard(container) {
  container.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'dashboard-header';
  header.innerHTML = '<h1>Планировщик задач</h1>';
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'dashboard-grid';
  container.appendChild(grid);

  renderTaskForm(grid);
  renderFilterPanel(grid);
  renderStatsSection(grid);
  renderOverdueSection(grid);
  renderWeekColumns(grid);
  renderCategorySection(grid);
}

/* ── Form ── */

function renderTaskForm(container) {
  const section = document.createElement('section');
  section.className = 'task-form-section';

  const form = document.createElement('form');
  form.className = 'task-form';
  form.id = 'task-form';
  form.noValidate = true;

  const fields = [
    { tag: 'input', name: 'title', type: 'text', label: 'Название', required: true, maxLength: 120, placeholder: 'Название задачи' },
    { tag: 'textarea', name: 'description', label: 'Описание', maxLength: 1000, rows: 3, placeholder: 'Описание (необязательно)' },
    { tag: 'select', name: 'categoryId', label: 'Категория', options: getCategories().map((c) => ({ value: c.id, text: c.name })) },
    { tag: 'select', name: 'priority', label: 'Приоритет', options: [
      { value: 'low', text: 'Низкий' },
      { value: 'medium', text: 'Средний' },
      { value: 'high', text: 'Высокий' },
    ]},
    { tag: 'input', name: 'estimatedHours', type: 'number', label: 'Оценка (часы)', min: 0, max: 24, step: 0.5, placeholder: '0' },
    { tag: 'input', name: 'date', type: 'date', label: 'Дата' },
    { tag: 'select', name: 'repetition', label: 'Повторение', options: [
      { value: 'none', text: 'Нет' },
      { value: 'daily', text: 'Ежедневно' },
      { value: 'weekdays', text: 'По дням недели' },
      { value: 'weekly', text: 'Еженедельно' },
      { value: 'monthly', text: 'Ежемесячно' },
    ]},
  ];

  fields.forEach((f) => {
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = f.label;
    group.appendChild(label);

    let el;
    if (f.tag === 'select') {
      el = document.createElement('select');
      el.name = f.name;
      el.className = 'form-select';
      f.options.forEach((o) => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        el.appendChild(opt);
      });
    } else if (f.tag === 'textarea') {
      el = document.createElement('textarea');
      el.name = f.name;
      el.className = 'form-textarea';
      if (f.rows) el.rows = f.rows;
      if (f.maxLength) el.maxLength = f.maxLength;
      if (f.placeholder) el.placeholder = f.placeholder;
    } else {
      el = document.createElement('input');
      el.type = f.type;
      el.name = f.name;
      el.className = 'form-input';
      if (f.required) el.required = true;
      if (f.maxLength) el.maxLength = f.maxLength;
      if (f.min !== undefined) el.min = f.min;
      if (f.max !== undefined) el.max = f.max;
      if (f.step !== undefined) el.step = f.step;
      if (f.placeholder) el.placeholder = f.placeholder;
    }

    group.appendChild(el);
    form.appendChild(group);
  });

  const btnRow = document.createElement('div');
  btnRow.className = 'form-actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.textContent = 'Добавить задачу';
  btnRow.appendChild(submitBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn-cancel';
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

  section.appendChild(form);
  container.appendChild(section);

  resetForm(form, submitBtn, cancelBtn, errorsEl);
}

function handleFormSubmit(form, errorsEl, submitBtn, cancelBtn) {
  const data = collectFormData(form);
  const errors = validateTask(data);

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
  reRenderDynamic();
}

function collectFormData(form) {
  return {
    title: form.title.value,
    description: form.description.value,
    categoryId: form.categoryId.value,
    priority: form.priority.value,
    estimatedHours: form.estimatedHours.value,
    date: form.date.value,
    repetition: form.repetition.value,
  };
}

function validateTask(data) {
  const errs = [];
  if (!data.title || data.title.trim().length === 0) {
    errs.push('Название не может быть пустым.');
  } else if (data.title.trim().length > 120) {
    errs.push('Название не может превышать 120 символов.');
  }
  if (data.description && data.description.length > 1000) {
    errs.push('Описание не может превышать 1000 символов.');
  }
  const hours = Number(data.estimatedHours);
  if (data.estimatedHours !== '' && (isNaN(hours) || hours < 0 || hours > 24)) {
    errs.push('Оценка в часах должна быть от 0 до 24.');
  }
  return errs;
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
  submitBtn.textContent = 'Добавить задачу';
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
}

/* ── Filter panel ── */

function renderFilterPanel(container) {
  const existing = container.querySelector('.filters-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.className = 'filters-panel';

  const catGroup = document.createElement('div');
  catGroup.className = 'filter-group';
  const catLabel = document.createElement('label');
  catLabel.className = 'filter-label';
  catLabel.textContent = 'Категория';
  const catSelect = document.createElement('select');
  catSelect.className = 'form-select filter-select';
  catSelect.id = 'filter-category';
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
  catGroup.appendChild(catLabel);
  catGroup.appendChild(catSelect);
  panel.appendChild(catGroup);

  const prioGroup = document.createElement('div');
  prioGroup.className = 'filter-group';
  const prioLabel = document.createElement('label');
  prioLabel.className = 'filter-label';
  prioLabel.textContent = 'Приоритет';
  const prioSelect = document.createElement('select');
  prioSelect.className = 'form-select filter-select';
  prioSelect.id = 'filter-priority';
  const prioAll = document.createElement('option');
  prioAll.value = '';
  prioAll.textContent = 'Все';
  prioSelect.appendChild(prioAll);
  ['low', 'medium', 'high'].forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }[p];
    prioSelect.appendChild(opt);
  });
  prioSelect.value = filterPriority;
  prioGroup.appendChild(prioLabel);
  prioGroup.appendChild(prioSelect);
  panel.appendChild(prioGroup);

  const overdueGroup = document.createElement('div');
  overdueGroup.className = 'filter-group filter-checkbox';
  const overdueCheck = document.createElement('input');
  overdueCheck.type = 'checkbox';
  overdueCheck.id = 'filter-overdue';
  overdueCheck.checked = filterOverdueOnly;
  const overdueLabel = document.createElement('label');
  overdueLabel.className = 'filter-label-check';
  overdueLabel.htmlFor = 'filter-overdue';
  overdueLabel.textContent = 'Только просроченные';
  overdueGroup.appendChild(overdueCheck);
  overdueGroup.appendChild(overdueLabel);
  panel.appendChild(overdueGroup);

  const hideGroup = document.createElement('div');
  hideGroup.className = 'filter-group filter-checkbox';
  const hideCheck = document.createElement('input');
  hideCheck.type = 'checkbox';
  hideCheck.id = 'filter-hide-completed';
  hideCheck.checked = filterHideCompleted;
  const hideLabel = document.createElement('label');
  hideLabel.className = 'filter-label-check';
  hideLabel.htmlFor = 'filter-hide-completed';
  hideLabel.textContent = 'Скрыть завершённые';
  hideGroup.appendChild(hideCheck);
  hideGroup.appendChild(hideLabel);
  panel.appendChild(hideGroup);

  const onFilterChange = () => {
    filterCategory = document.getElementById('filter-category').value;
    filterPriority = document.getElementById('filter-priority').value;
    filterOverdueOnly = document.getElementById('filter-overdue').checked;
    filterHideCompleted = document.getElementById('filter-hide-completed').checked;
    reRenderDynamic();
  };

  catSelect.addEventListener('change', onFilterChange);
  prioSelect.addEventListener('change', onFilterChange);
  overdueCheck.addEventListener('change', onFilterChange);
  hideCheck.addEventListener('change', onFilterChange);

  container.appendChild(panel);
}

/* ── Stats section ── */

function renderStatsSection(container) {
  const existing = container.querySelector('.stats-section');
  if (existing) existing.remove();

  const allTasks = getTasks();
  const activeTasks = allTasks.filter((t) => t.status === 'active');
  const completedTasks = allTasks.filter((t) => t.status === 'completed');
  const totalActive = activeTasks.length;
  const totalCompleted = completedTasks.length;
  const totalAll = totalActive + totalCompleted;
  const pct = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0;

  const section = document.createElement('section');
  section.className = 'stats-section';

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Статистика';
  section.appendChild(title);

  const body = document.createElement('div');
  body.className = 'stats-body';

  const pctBlock = document.createElement('div');
  pctBlock.className = 'stat-block stat-completion';
  pctBlock.innerHTML = `
    <span class="stat-value">${pct}%</span>
    <span class="stat-label">выполнения</span>
    <span class="stat-sub">${totalCompleted} из ${totalAll} задач</span>
  `;
  body.appendChild(pctBlock);

  const catBlock = document.createElement('div');
  catBlock.className = 'stat-block stat-categories';
  const catTitle = document.createElement('span');
  catTitle.className = 'stat-label';
  catTitle.textContent = 'По категориям';
  catBlock.appendChild(catTitle);

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
  container.insertBefore(section, container.querySelector('.overdue-section') || container.querySelector('.week-columns'));
}

/* ── Re-render helper ── */

function reRenderDynamic() {
  const grid = document.querySelector('.dashboard-grid');
  if (!grid) return;
  renderStatsSection(grid);
  renderOverdueSection(grid);
  renderWeekColumns(grid);
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
  title.textContent = `Просроченные задачи (${tasks.length})`;
  section.appendChild(title);

  const list = document.createElement('div');
  list.className = 'overdue-list';

  tasks.forEach((task) => {
    list.appendChild(createTaskCard(task, container));
  });

  section.appendChild(list);
  container.insertBefore(section, container.querySelector('.week-columns'));
}

/* ── Week columns ── */

function renderWeekColumns(container) {
  const existing = container.querySelector('.week-columns');
  if (existing) existing.remove();

  const section = document.createElement('section');
  section.className = 'week-columns';

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Неделя';
  section.appendChild(title);

  const weeks = document.createElement('div');
  weeks.className = 'week-grid';

  const weekDates = getWeekDates();
  const today = todayStr();
  const allTasks = applyFilters(getTasks());

  weekDates.forEach((dayInfo) => {
    const dayTasks = allTasks.filter((t) => t.date === dayInfo.dateStr && t.status !== 'completed');
    const isToday = dayInfo.dateStr === today;
    weeks.appendChild(createDayColumn(dayInfo, dayTasks, isToday, container));
  });

  const noDateTasks = allTasks.filter((t) => !t.date && t.status !== 'completed');
  if (noDateTasks.length > 0) {
    const dayInfo = { dateStr: '', dayName: 'Без даты', shortLabel: '—' };
    weeks.appendChild(createDayColumn(dayInfo, noDateTasks, false, container));
  }

  section.appendChild(weeks);
  container.appendChild(section);
}

function createDayColumn(dayInfo, tasks, isToday, container) {
  const col = document.createElement('div');
  col.className = 'day-column';
  if (isToday) col.classList.add('day-today');

  const hours = totalHours(tasks);

  const header = document.createElement('div');
  header.className = 'day-header';
  header.innerHTML = `
    <span class="day-name">${dayInfo.dayName}</span>
    <span class="day-date">${dayInfo.shortLabel}</span>
    ${hours > 0 ? `<span class="day-load">${hours}ч</span>` : ''}
    <span class="day-count">${tasks.length}</span>
    <span class="day-toggle">${isToday ? '▼' : '▶'}</span>
  `;
  col.appendChild(header);

  if (!isToday) col.classList.add('day-collapsed');

  header.addEventListener('click', () => {
    col.classList.toggle('day-collapsed');
    const toggle = header.querySelector('.day-toggle');
    toggle.textContent = col.classList.contains('day-collapsed') ? '▶' : '▼';
  });

  const body = document.createElement('div');
  body.className = 'day-body';

  if (tasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'day-empty';
    empty.textContent = 'Нет задач';
    body.appendChild(empty);
  } else {
    const groups = groupByCategory(tasks);
    const catMap = {};
    getCategories().forEach((c) => { catMap[c.id] = c; });

    let first = true;
    Object.entries(groups).forEach(([catId, groupTasks]) => {
      if (!first) {
        const sep = document.createElement('div');
        sep.className = 'group-separator';
        body.appendChild(sep);
      }
      first = false;

      if (Object.keys(groups).length > 1 || catId !== 'none') {
        const cat = catMap[catId];
        if (cat) {
          const groupHeader = document.createElement('div');
          groupHeader.className = 'group-header';
          groupHeader.innerHTML = `
            <span class="group-dot" style="background:${cat.color}"></span>
            <span class="group-name">${cat.name}</span>
          `;
          body.appendChild(groupHeader);
        }
      }

      groupTasks.forEach((task) => {
        body.appendChild(createTaskCard(task, container));
      });
    });
  }

  col.appendChild(body);
  return col;
}

/* ── Task card ── */

function createTaskCard(task, container) {
  const card = document.createElement('div');
  card.className = `task-card task-${task.status}`;
  card.dataset.id = task.id;

  const priorityLabels = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
  const category = getCategories().find((c) => c.id === task.categoryId);

  const weekDates = getWeekDates();
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
      <span class="task-status status-${task.status}">${task.status === 'active' ? 'В работе' : 'Завершена'}</span>
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
      <button class="btn btn-sm btn-edit" data-action="edit">Редактировать</button>
      <button class="btn btn-sm btn-delete" data-action="delete">Удалить</button>
    </div>
  `;

  card.querySelector('[data-action="toggle"]').addEventListener('click', () => {
    toggleTaskStatus(task.id);
    reRenderDynamic();
  });

  card.querySelector('[data-action="edit"]').addEventListener('click', () => {
    fillFormForEdit(task);
  });

  card.querySelector('[data-action="delete"]').addEventListener('click', () => {
    deleteTask(task.id);
    reRenderDynamic();
  });

  const dateSelect = card.querySelector('.task-date-select');
  dateSelect.addEventListener('change', (e) => {
    const newDate = e.target.value;
    updateTaskDate(task.id, newDate);
    reRenderDynamic();
  });

  return card;
}

/* ── Categories ── */

function renderCategorySection(container) {
  const existing = container.querySelector('.categories-section');
  if (existing) existing.remove();

  const section = document.createElement('section');
  section.className = 'categories-section';

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Категории';
  section.appendChild(title);

  const list = document.createElement('div');
  list.className = 'categories-list';

  const categories = getCategories();
  categories.forEach((cat) => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <span class="category-dot" style="background:${cat.color}"></span>
      <span class="category-name">${cat.name}</span>
    `;
    list.appendChild(card);
  });

  section.appendChild(list);
  container.appendChild(section);
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