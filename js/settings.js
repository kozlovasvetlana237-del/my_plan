import {
  getCategories, addCategory, updateCategory, deleteCategory,
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

  renderCategorySection(layout, container);
  renderExportImport(layout);

  container.appendChild(layout);
}

/* ── Categories ── */

function renderCategorySection(container, outerContainer) {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Категории';
  section.appendChild(title);

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

    const nameSpan = document.createElement('span');
    nameSpan.className = 'settings-cat-name';
    nameSpan.textContent = cat.name;
    row.appendChild(nameSpan);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-edit';
    editBtn.textContent = 'Ред';
    row.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-delete';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', () => {
      const err = deleteCategory(cat.id);
      if (err) {
        showError(section, err);
      } else {
        renderSettings(outerContainer);
      }
    });
    row.appendChild(delBtn);

    editBtn.addEventListener('click', () => {
      row.innerHTML = '';

      const dotEdit = document.createElement('span');
      dotEdit.className = 'settings-cat-dot';
      dotEdit.style.background = cat.color;
      row.appendChild(dotEdit);

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'form-input form-input-sm';
      nameInput.value = cat.name;
      nameInput.maxLength = 60;
      row.appendChild(nameInput);

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'settings-color-input';
      colorInput.value = cat.color;
      row.appendChild(colorInput);

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn btn-sm btn-primary';
      saveBtn.textContent = 'Сохранить';
      saveBtn.addEventListener('click', () => {
        const val = nameInput.value.trim();
        if (!val) return;
        updateCategory(cat.id, { name: val, color: colorInput.value });
        renderSettings(outerContainer);
      });
      row.appendChild(saveBtn);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-sm btn-cancel';
      cancelBtn.textContent = 'Отмена';
      cancelBtn.addEventListener('click', () => {
        renderSettings(outerContainer);
      });
      row.appendChild(cancelBtn);
    });

    catList.appendChild(row);
  });

  section.appendChild(catList);

  const addForm = document.createElement('form');
  addForm.className = 'settings-cat-add';
  addForm.noValidate = true;

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'form-input';
  nameInput.placeholder = 'Новая категория...';
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
    renderSettings(outerContainer);
  });

  section.appendChild(addForm);
  container.appendChild(section);
}

/* ── Export / Import ── */

function renderExportImport(container) {
  const section = document.createElement('section');
  section.className = 'settings-section';

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = 'Экспорт / Импорт';
  section.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'settings-desc';
  desc.textContent = 'Сохраните резервную копию или восстановите данные.';
  section.appendChild(desc);

  const btnRow = document.createElement('div');
  btnRow.className = 'settings-btn-row';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-primary';
  exportBtn.textContent = 'Скачать JSON';
  exportBtn.addEventListener('click', () => exportData());
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
        showError(section, err);
      } else {
        window.location.reload();
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
  importLabel.appendChild(fileInput);
  btnRow.appendChild(importLabel);

  section.appendChild(btnRow);
  container.appendChild(section);
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
