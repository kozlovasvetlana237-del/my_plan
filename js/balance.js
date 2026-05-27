import { getBalanceState, setBalanceState, saveBalanceEntry, getBalanceEntries } from './state.js';

const SPHERES = [
  { id: 'business', name: 'Бизнес/Деньги' },
  { id: 'purpose', name: 'Предназначение' },
  { id: 'health', name: 'Здоровье/Красота' },
  { id: 'hobby', name: 'Хобби/Отдых' },
  { id: 'friends', name: 'Друзья/Окружение' },
  { id: 'family', name: 'Семья/Отношения' },
  { id: 'kids', name: 'Дети/Творчество' },
  { id: 'wisdom', name: 'Мудрость/Знания' },
  { id: 'work', name: 'Работа' },
];

function monthLabel() {
  const d = new Date();
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  return months[d.getMonth()] + ' ' + d.getFullYear();
}

function monthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function renderBalanceWheel(container) {
  container.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'dashboard-header';
  header.innerHTML = '<h1>Колесо баланса</h1>';
  container.appendChild(header);

  const layout = document.createElement('div');
  layout.className = 'balance-layout';

  const saved = getBalanceState();
  const entries = getBalanceEntries();

  const values = saved && saved.values ? { ...saved.values } : {};
  const ideals = saved && saved.ideals ? { ...saved.ideals } : {};
  SPHERES.forEach((s) => {
    if (values[s.id] === undefined) values[s.id] = 5;
    if (ideals[s.id] === undefined) ideals[s.id] = '';
  });

  const leftCol = document.createElement('div');
  leftCol.className = 'balance-canvas-col';

  const canvas = document.createElement('canvas');
  canvas.className = 'balance-canvas';
  canvas.width = 420;
  canvas.height = 420;
  leftCol.appendChild(canvas);

  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  if (lastEntry) {
    const info = document.createElement('p');
    info.className = 'balance-saved-info';
    info.textContent = 'Сохранено: ' + (lastEntry.monthLabel || lastEntry.month);
    leftCol.appendChild(info);
  }

  layout.appendChild(leftCol);

  const rightCol = document.createElement('div');
  rightCol.className = 'balance-controls-col';

  SPHERES.forEach((s) => {
    const row = document.createElement('div');
    row.className = 'balance-row';

    const label = document.createElement('span');
    label.className = 'balance-label';
    label.textContent = s.name;
    row.appendChild(label);

    const range = document.createElement('input');
    range.type = 'range';
    range.className = 'balance-range';
    range.min = 1;
    range.max = 10;
    range.step = 1;
    range.value = values[s.id];
    range.dataset.id = s.id;
    row.appendChild(range);

    const valSpan = document.createElement('span');
    valSpan.className = 'balance-value';
    valSpan.textContent = range.value;
    row.appendChild(valSpan);

    const ideal = document.createElement('textarea');
    ideal.className = 'balance-ideal';
    ideal.placeholder = 'Идеальное состояние';
    ideal.rows = 2;
    ideal.value = ideals[s.id] || '';
    ideal.dataset.id = s.id;
    row.appendChild(ideal);

    range.addEventListener('input', () => {
      valSpan.textContent = range.value;
      values[s.id] = Number(range.value);
      setBalanceState({ values, ideals });
      drawRadarChart(canvas, values, SPHERES);
    });

    ideal.addEventListener('input', () => {
      ideals[s.id] = ideal.value;
      setBalanceState({ values, ideals });
    });

    rightCol.appendChild(row);
  });

  layout.appendChild(rightCol);
  container.appendChild(layout);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary balance-save-btn';
  saveBtn.textContent = 'Сохранить оценку месяца (' + monthLabel() + ')';
  container.appendChild(saveBtn);

  const msg = document.createElement('p');
  msg.className = 'balance-msg';
  container.appendChild(msg);

  saveBtn.addEventListener('click', () => {
    const entry = {
      month: monthKey(),
      monthLabel: monthLabel(),
      spheres: SPHERES.map((s) => ({
        id: s.id,
        name: s.name,
        value: values[s.id],
        ideal: ideals[s.id] || '',
      })),
      savedAt: new Date().toISOString(),
    };
    saveBalanceEntry(entry);
    msg.textContent = 'Оценка за ' + monthLabel() + ' сохранена!';
    msg.classList.add('balance-msg-ok');
    setTimeout(() => { msg.classList.remove('balance-msg-ok'); }, 3000);
  });

  drawRadarChart(canvas, values, SPHERES);
}

function drawRadarChart(canvas, values, spheres) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const num = spheres.length;
  const maxR = Math.min(cx, cy) * 0.62;
  const angleStep = (2 * Math.PI) / num;

  ctx.clearRect(0, 0, w, h);

  // draw concentric rings
  for (let level = 2; level <= 10; level += 2) {
    const r = (maxR * level) / 10;
    ctx.beginPath();
    for (let i = 0; i <= num; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#e0dbd4';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (level < 10) {
      ctx.fillStyle = '#b8b0a8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lx = cx + r * Math.cos(-Math.PI / 2 + 0.3);
      const ly = cy + r * Math.sin(-Math.PI / 2 + 0.3);
      ctx.fillText(String(level), lx, ly);
    }
  }

  // draw axes
  for (let i = 0; i < num; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
    ctx.strokeStyle = '#e0dbd4';
    ctx.stroke();
  }

  // draw data polygon
  const dataPoints = [];
  for (let i = 0; i < num; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const val = values[spheres[i].id] || 0;
    const r = (maxR * val) / 10;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    dataPoints.push({ x, y });
  }

  ctx.beginPath();
  dataPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(143, 168, 139, 0.18)';
  ctx.fill();
  ctx.strokeStyle = '#8fa88b';
  ctx.lineWidth = 2;
  ctx.stroke();

  dataPoints.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#8fa88b';
    ctx.fill();
  });

  // draw labels
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < num; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    const lx = cx + (maxR + 28) * Math.cos(angle);
    const ly = cy + (maxR + 28) * Math.sin(angle);

    const name = spheres[i].name;
    const parts = name.split('/');
    if (parts.length > 1) {
      ctx.fillStyle = '#3a3a3a';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(parts[0].trim(), lx, ly - 6);
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('/ ' + parts[1].trim(), lx, ly + 8);
    } else {
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#3a3a3a';
      ctx.fillText(name, lx, ly);
    }
  }

  // title
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#3a3a3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(monthLabel(), cx, cy - maxR - 14);
}

export { renderBalanceWheel };