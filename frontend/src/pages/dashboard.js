/**
 * Dashboard — Visão gerencial do sistema.
 * Exibe ocupação, estatísticas e últimos eventos.
 */
import { ocupacaoApi, eventosApi } from '../services/api.js';
import {
  conectar,
  registrarDashboard,
  ouvirOcupacao,
  ouvirEventos,
} from '../services/websocket.js';
import { API_URL } from '../services/api.js';

export function renderDashboard(container, onNavigate) {
  container.innerHTML = `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>📊 Dashboard</h1>
        <button class="btn btn-ghost" id="dash-back">← Voltar</button>
      </div>

      <div class="dashboard-grid animate-slide-up">
        <div class="stat-card">
          <div class="stat-card-value text-entrada" id="dash-ocupacao">—</div>
          <div class="stat-card-label">Pessoas no Recinto</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value text-entrada" id="dash-entradas">—</div>
          <div class="stat-card-label">Entradas Hoje</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value text-saida" id="dash-saidas">—</div>
          <div class="stat-card-label">Saídas Hoje</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value" id="dash-total" style="color: var(--color-accent);">—</div>
          <div class="stat-card-label">Total de Eventos</div>
        </div>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: var(--space-md);">
        <h2 style="font-size: var(--font-size-lg); font-weight: 600;">Últimos Eventos</h2>
        <button class="btn btn-ghost" id="dash-refresh" style="font-size: var(--font-size-sm);">🔄 Atualizar</button>
      </div>

      <div class="events-list" id="events-list">
        <p style="color: var(--text-muted); text-align: center; padding: var(--space-xl);">
          Carregando eventos...
        </p>
      </div>

      <div style="margin-top: var(--space-xl); display: flex; gap: var(--space-md);">
        <button class="btn btn-ghost" id="dash-reset" style="flex:1;">
          🔄 Resetar Ocupação
        </button>
      </div>
    </div>
  `;

  loadDashboardData(container);

  // WebSocket para atualizações em tempo real
  conectar();
  registrarDashboard();

  ouvirOcupacao((data) => {
    container.querySelector('#dash-ocupacao').textContent = Math.max(0, data.contagem);
  });

  ouvirEventos(() => {
    loadDashboardData(container);
  });

  // Navegação
  container.querySelector('#dash-back').addEventListener('click', () => {
    onNavigate({ page: 'setup' });
  });

  container.querySelector('#dash-refresh').addEventListener('click', () => {
    loadDashboardData(container);
  });

  container.querySelector('#dash-reset').addEventListener('click', async () => {
    if (confirm('Resetar a contagem de ocupação para 0?')) {
      try {
        await ocupacaoApi.resetar(0);
        container.querySelector('#dash-ocupacao').textContent = 0;
      } catch (error) {
        alert(`Erro: ${error.message}`);
      }
    }
  });
}

async function loadDashboardData(container) {
  try {
    // Ocupação
    const ocupacao = await ocupacaoApi.obter();
    container.querySelector('#dash-ocupacao').textContent = Math.max(0, ocupacao?.contagem ?? 0);

    // Estatísticas do dia
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const stats = await eventosApi.estatisticas({ data_inicio: hoje.toISOString() });

    container.querySelector('#dash-entradas').textContent = stats?.total_entradas ?? 0;
    container.querySelector('#dash-saidas').textContent = stats?.total_saidas ?? 0;
    container.querySelector('#dash-total').textContent = stats?.total_eventos ?? 0;

    // Últimos eventos
    const { dados: eventos } = await eventosApi.listar({ limite: 20 });
    renderEventsList(container, eventos);
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
  }
}

function renderEventsList(container, eventos) {
  const list = container.querySelector('#events-list');

  if (!eventos || eventos.length === 0) {
    list.innerHTML = `
      <p style="color: var(--text-muted); text-align: center; padding: var(--space-xl);">
        Nenhum evento registrado ainda
      </p>
    `;
    return;
  }

  list.innerHTML = eventos.map((evento) => {
    const hora = new Date(evento.registrado_em).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const tipoClass = evento.tipo === 'ENTRADA' ? 'entrada' : 'saida';
    const tipoLabel = evento.tipo === 'ENTRADA' ? '↓ Entrada' : '↑ Saída';
    const imgSrc = evento.imagem_rosto_url
      ? `${API_URL}${evento.imagem_rosto_url}`
      : '';
    const deviceName = evento.dispositivo?.nome || '—';

    return `
      <div class="event-item">
        ${imgSrc
          ? `<img class="event-thumb" src="${imgSrc}" alt="Rosto" loading="lazy" />`
          : `<div class="event-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;">👤</div>`
        }
        <div>
          <span class="event-badge ${tipoClass}">${tipoLabel}</span>
          <div style="font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px;">
            ${deviceName}
          </div>
        </div>
        <span class="event-time">${hora}</span>
      </div>
    `;
  }).join('');
}
