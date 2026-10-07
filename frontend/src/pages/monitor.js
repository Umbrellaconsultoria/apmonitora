/**
 * Tela de Monitor — Tela principal do tablet na portaria.
 * Exibe câmera, detecta rostos, captura e envia para o backend.
 */
import { iniciarCamera, pararCamera, capturarFrame } from '../services/camera.js';
import { iniciarDeteccao, pararDeteccao } from '../services/faceDetection.js';
import { eventosApi, ocupacaoApi } from '../services/api.js';
import {
  conectar,
  registrarDispositivo,
  ouvirOcupacao,
  ouvirConexao,
} from '../services/websocket.js';

let device = null;
let ocupacaoAtual = 0;
let entradasHoje = 0;
let saidasHoje = 0;
let capturing = false;
let cooldownMs = 3000; // Tempo mínimo entre capturas (evita duplicatas)
let lastCapture = 0;

export function renderMonitor(container, deviceConfig, onNavigate) {
  device = deviceConfig;
  const isEntrada = device.tipo === 'ENTRADA';
  const tipoClass = isEntrada ? 'entrada' : 'saida';
  const tipoLabel = isEntrada ? '↓ ENTRADA' : '↑ SAÍDA';
  const tipoIcon = isEntrada ? '🟢' : '🔴';

  container.innerHTML = `
    <div class="monitor-container">
      <!-- Header com tipo -->
      <div class="monitor-header tipo-${tipoClass}">
        <div>
          <div class="monitor-tipo-badge ${tipoClass}">
            <span class="monitor-tipo-icon">${tipoIcon}</span>
            <span>${tipoLabel}</span>
          </div>
          <div class="monitor-device-name">${device.nome}</div>
        </div>
        <button class="monitor-settings-btn" id="monitor-settings" title="Configurações">
          ⚙️
        </button>
      </div>

      <!-- Área da câmera -->
      <div class="camera-area">
        <video id="camera-video" class="camera-video" autoplay playsinline muted></video>
        <canvas id="camera-canvas" class="camera-canvas"></canvas>
        <div class="face-guide" id="face-guide"></div>
        <div class="face-detected-overlay ${tipoClass}" id="face-overlay"></div>
        <div class="capture-feedback ${tipoClass}" id="capture-feedback">✓</div>
        <div class="capture-flash" id="capture-flash"></div>

        <!-- Erro de câmera -->
        <div class="camera-error hidden" id="camera-error">
          <div class="camera-error-icon">📷</div>
          <p>Não foi possível acessar a câmera</p>
          <p id="camera-error-msg" style="font-size: 0.75rem; color: var(--text-muted);"></p>
          <button class="btn btn-ghost mt-md" id="retry-camera">Tentar Novamente</button>
        </div>
      </div>

      <!-- Footer com ocupação -->
      <div class="monitor-footer">
        <div class="occupancy-display">
          <div>
            <div class="occupancy-count" id="occupancy-count">0</div>
            <div class="occupancy-label">no recinto</div>
          </div>
        </div>
        <div class="monitor-stats">
          <div class="stat-item">
            <div class="stat-value entrada" id="stat-entradas">0</div>
            <div class="stat-label">Entradas</div>
          </div>
          <div class="stat-item">
            <div class="stat-value saida" id="stat-saidas">0</div>
            <div class="stat-label">Saídas</div>
          </div>
          <div class="stat-item">
            <div class="status-dot" id="status-dot" title="Conectado"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const video = container.querySelector('#camera-video');
  const canvas = container.querySelector('#camera-canvas');
  const faceGuide = container.querySelector('#face-guide');
  const faceOverlay = container.querySelector('#face-overlay');
  const captureFeedback = container.querySelector('#capture-feedback');
  const captureFlash = container.querySelector('#capture-flash');
  const cameraError = container.querySelector('#camera-error');
  const cameraErrorMsg = container.querySelector('#camera-error-msg');

  // Iniciar câmera
  startCamera();

  async function startCamera() {
    cameraError.classList.add('hidden');
    const result = await iniciarCamera(video);

    if (!result.success) {
      cameraError.classList.remove('hidden');
      cameraErrorMsg.textContent = result.error;
      return;
    }

    // Iniciar detecção facial
    iniciarDeteccao(video, canvas, handleFaceDetection, {
      intervalo: 250,
      scoreMinimo: 0.5,
    });
  }

  // Handler de detecção de face
  function handleFaceDetection(detections) {
    if (detections && detections.length > 0) {
      faceGuide.classList.add('detected');
      faceOverlay.classList.add('active');

      const now = Date.now();
      if (!capturing && now - lastCapture > cooldownMs) {
        capturarERegistrar(video, detections[0]);
      }
    } else {
      faceGuide.classList.remove('detected');
      faceOverlay.classList.remove('active');
    }
  }

  // Capturar e enviar para o backend
  async function capturarERegistrar(videoEl, detection) {
    capturing = true;
    lastCapture = Date.now();

    try {
      // Flash visual
      captureFlash.classList.add('active');
      setTimeout(() => captureFlash.classList.remove('active'), 300);

      // Capturar frame
      const blob = await capturarFrame(videoEl);

      // Enviar para backend
      const formData = new FormData();
      formData.append('dispositivo_id', device.id);
      formData.append('tipo', device.tipo);
      formData.append('confianca', detection.detection.score.toString());
      formData.append('imagem_rosto', blob, 'rosto.jpg');

      const result = await eventosApi.registrar(formData);

      // Feedback visual de sucesso
      captureFeedback.classList.add('show');
      setTimeout(() => captureFeedback.classList.remove('show'), 800);

      // Atualizar contadores locais
      if (device.tipo === 'ENTRADA') {
        entradasHoje++;
        container.querySelector('#stat-entradas').textContent = entradasHoje;
      } else {
        saidasHoje++;
        container.querySelector('#stat-saidas').textContent = saidasHoje;
      }

      if (result?.ocupacao) {
        atualizarOcupacao(result.ocupacao.contagem);
      }

      console.log(`✅ ${device.tipo} registrada | Ocupação: ${ocupacaoAtual}`);
    } catch (error) {
      console.error('Erro ao registrar evento:', error);
    } finally {
      capturing = false;
    }
  }

  function atualizarOcupacao(contagem) {
    ocupacaoAtual = Math.max(0, contagem);
    container.querySelector('#occupancy-count').textContent = ocupacaoAtual;
  }

  // WebSocket
  conectar();
  registrarDispositivo(device.id, device.tipo);

  ouvirOcupacao((data) => {
    atualizarOcupacao(data.contagem);
  });

  ouvirConexao((data) => {
    const dot = container.querySelector('#status-dot');
    if (data.status === 'conectado' || data.status === 'reconectado') {
      dot.classList.remove('offline');
      dot.title = 'Conectado';
    } else {
      dot.classList.add('offline');
      dot.title = 'Desconectado';
    }
  });

  // Carregar ocupação inicial
  ocupacaoApi.obter().then((data) => {
    if (data) atualizarOcupacao(data.contagem);
  }).catch(() => {});

  // Carregar stats do dia
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  eventosApi.estatisticas({ data_inicio: hoje.toISOString() }).then((stats) => {
    if (stats) {
      entradasHoje = stats.total_entradas;
      saidasHoje = stats.total_saidas;
      container.querySelector('#stat-entradas').textContent = entradasHoje;
      container.querySelector('#stat-saidas').textContent = saidasHoje;
    }
  }).catch(() => {});

  // Retry camera
  container.querySelector('#retry-camera')?.addEventListener('click', startCamera);

  // Settings — voltar ao setup
  container.querySelector('#monitor-settings').addEventListener('click', () => {
    pararDeteccao();
    pararCamera();
    localStorage.removeItem('apmonitora_device');
    onNavigate({ page: 'setup' });
  });
}

export function destroyMonitor() {
  pararDeteccao();
  pararCamera();
}
