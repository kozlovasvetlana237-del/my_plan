import { renderDashboard } from './ui.js';
import { renderBalanceWheel } from './balance.js';
import { renderMonthlyPlan } from './monthly.js';
import { renderSettings } from './settings.js';

let currentView = 'dashboard';

function renderNav() {
  const app = document.getElementById('app');
  let nav = app.querySelector('.app-nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'app-nav';
    app.insertBefore(nav, app.firstChild);
  }
  nav.innerHTML = `
    <button class="nav-btn${currentView === 'dashboard' ? ' nav-active' : ''}" data-view="dashboard">Главная</button>
    <button class="nav-btn${currentView === 'balance' ? ' nav-active' : ''}" data-view="balance">Колесо баланса</button>
    <button class="nav-btn${currentView === 'monthly' ? ' nav-active' : ''}" data-view="monthly">План месяца</button>
    <button class="nav-btn${currentView === 'settings' ? ' nav-active' : ''}" data-view="settings">Настройки</button>
  `;
  nav.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === currentView) return;
      currentView = view;
      renderView();
    });
  });
}

function renderView() {
  const app = document.getElementById('app');
  renderNav();
  const content = app.querySelector('.app-content') || document.createElement('div');
  content.className = 'app-content';
  if (!app.contains(content)) {
    app.appendChild(content);
  }

  if (currentView === 'dashboard') {
    renderDashboard(content);
  } else if (currentView === 'balance') {
    renderBalanceWheel(content);
  } else if (currentView === 'monthly') {
    renderMonthlyPlan(content);
  } else if (currentView === 'settings') {
    renderSettings(content);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="app-content"></div>';
  renderView();
});