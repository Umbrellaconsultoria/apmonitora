/**
 * apMonitora — Entry Point
 * Gerencia roteamento entre Setup, Monitor e Dashboard.
 */
import { carregarModelos } from './services/faceDetection.js';
import { renderSetup } from './pages/setup.js';
import { renderMonitor, destroyMonitor } from './pages/monitor.js';
import { renderDashboard } from './pages/dashboard.js';

const pages = {
  setup: document.getElementById('setup-page'),
  monitor: document.getElementById('monitor-page'),
  dashboard: document.getElementById('dashboard-page'),
};

const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('loading-progress');

let currentPage = null;

function showPage(name) {
  // Destruir página anterior
  if (currentPage === 'monitor') {
    destroyMonitor();
  }

  Object.entries(pages).forEach(([key, el]) => {
    el.style.display = key === name ? 'block' : 'none';
  });
  currentPage = name;
}

function navigate(action) {
  switch (action.page) {
    case 'setup':
      showPage('setup');
      renderSetup(pages.setup, navigate);
      break;

    case 'monitor':
      showPage('monitor');
      renderMonitor(pages.monitor, action.device, navigate);
      break;

    case 'dashboard':
      showPage('dashboard');
      renderDashboard(pages.dashboard, navigate);
      break;
  }
}

async function init() {
  try {
    // Carregar modelos de detecção facial
    await carregarModelos((progress) => {
      progressBar.style.width = `${progress}%`;
    });

    // Esconder loading
    loadingScreen.style.display = 'none';

    // Verificar se existe dispositivo salvo
    const savedDevice = localStorage.getItem('apmonitora_device');

    if (savedDevice) {
      const device = JSON.parse(savedDevice);
      navigate({ page: 'monitor', device });
    } else {
      navigate({ page: 'setup' });
    }
  } catch (error) {
    console.error('Erro na inicialização:', error);

    // Mesmo com erro nos modelos, permitir acesso ao setup/dashboard
    loadingScreen.style.display = 'none';

    const savedDevice = localStorage.getItem('apmonitora_device');
    if (savedDevice) {
      navigate({ page: 'monitor', device: JSON.parse(savedDevice) });
    } else {
      navigate({ page: 'setup' });
    }
  }
}

init();
