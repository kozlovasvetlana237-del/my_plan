import {
  getCategories, addCategory, deleteCategory,
  exportData, importData,
} from './state.js';

function renderSettings(container) {
  container.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'dashboard-header';
  header.innerHTML = '<h1>Настройки</h1>';
  container.appendChild(header);

  const layout = document.createElement('div');
  layout.className = 'settings-layout';

  /* ── Categories section ── */

  const catSection = document.createElement('section');
  catSection.className = 'settings-section';

  const catTitle = document.createElement('h2');
  catTitle.className = 'section-title';
  catTitle.textContent = 'Категории';
  catSection.appendChild(catTitle);

  const catList = document.createElement('div');
  catList.className = 'settings-cat-list';

  const categories = getCategories();
  categories.forEach((cat) => {
    const row = document.createElement('div');
    row.className = 'settings-cat-row';

    const dot = document.createElement('span');
    dot.className = 'settings-cat-dot';
    dot.style.background = cat.color;
    row.appendChild(dot);

    const name = document.createElement('span');
    name.className = 'settings-cat-name';
    name.textContent = cat.name;
    row.appendChild(name);

    if (cat.system) {
      const badge = document.createElement('span');
      badge.className = 'settings-cat-badge';
      badge.textContent = 'системная';
      row.appendChild(badge);
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-delete';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', () => {
      const err = deleteCategory(cat.id);
      if (err) {
        showError(catSection, err);
      } else {
        renderSettings(container);
      }
    });
    row.appendChild(delBtn);

    catList.appendChild(row);
  });

  catSection.appendChild(catList);

  const addForm = document.createElement('form');
  addForm.className = 'settings-cat-add';
  addForm.noValidate = true;

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'form-input';
  nameInput.placeholder = 'Название категории...';
  nameInput.required = true;
  nameInput.maxLength = 60;
  addForm.appendChild(nameInput);

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.className = 'settings-color-input';
  colorInput.value = '#8fa88b';
  addForm.appendChild(colorInput);

  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.className = 'btn btn-primary btn-sm';
  addBtn.textContent = 'Добавить';
  addForm.appendChild(addBtn);

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = nameInput.value.trim();
    if (!val) return;
    addCategory(val, colorInput.value);
    renderSettings(container);
  });

  catSection.appendChild(addForm);
  layout.appendChild(catSection);

  /* ── Export / Import section ── */

  const ioSection = document.createElement('section');
  ioSection.className = 'settings-section';

  const ioTitle = document.createElement('h2');
  ioTitle.className = 'section-title';
  ioTitle.textContent = 'Экспорт / Импорт';
  ioSection.appendChild(ioTitle);

  const ioDesc = document.createElement('p');
  ioDesc.className = 'settings-desc';
  ioDesc.textContent = 'Сохраните резервную копию всех данных или восстановите из ранее сохранённого файла.';
  ioSection.appendChild(ioDesc);

  const btnRow = document.createElement('div');
  btnRow.className = 'settings-btn-row';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-primary';
  exportBtn.textContent = 'Скачать JSON';
  exportBtn.addEventListener('click', () => {
    exportData();
  });
  btnRow.appendChild(exportBtn);

  const importLabel = document.createElement('label');
  importLabel.className = 'btn btn-primary import-btn-label';
  importLabel.textContent = 'Загрузить JSON';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const err = importData(ev.target.result);
      if (err) {
        showError(ioSection, err);
      } else {
        window.location.reload();
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
  importLabel.appendChild(fileInput);
  btnRow.appendChild(importLabel);

  ioSection.appendChild(btnRow);
  layout.appendChild(ioSection);

  container.appendChild(layout);
}

function showError(section, msg) {
  const existing = section.querySelector('.settings-error');
  if (existing) existing.remove();
  const err = document.createElement('div');
  err.className = 'settings-error';
  err.textContent = msg;
  section.appendChild(err);
  setTimeout(() => err.remove(), 4000);
}

export { renderSettings };