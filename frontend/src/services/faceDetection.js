/**
 * Serviço de detecção facial client-side usando face-api.js.
 * Detecta rostos no video da câmera em tempo real.
 */
import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let detectionInterval = null;

const MODEL_URL = '/models';

/**
 * Carrega os modelos de detecção facial.
 * @param {Function} onProgress - Callback de progresso (0-100)
 */
export async function carregarModelos(onProgress) {
  if (modelsLoaded) return;

  try {
    onProgress?.(10);
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    onProgress?.(50);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
    onProgress?.(80);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    onProgress?.(100);

    modelsLoaded = true;
    console.log('🧠 Modelos de detecção facial carregados');
  } catch (error) {
    console.error('Erro ao carregar modelos:', error);
    throw new Error('Falha ao carregar modelos de detecção facial');
  }
}

/**
 * Inicia a detecção contínua de rostos.
 * @param {HTMLVideoElement} video - Elemento de video com stream da câmera
 * @param {HTMLCanvasElement} canvas - Canvas para desenhar detecções
 * @param {Function} onFaceDetected - Callback quando rosto é detectado
 * @param {Object} options - Opções de detecção
 */
export function iniciarDeteccao(video, canvas, onFaceDetected, options = {}) {
  const {
    intervalo = 300,      // ms entre detecções
    scoreMinimo = 0.5,    // confiança mínima
  } = options;

  if (!modelsLoaded) {
    console.error('Modelos não carregados. Chame carregarModelos() primeiro.');
    return;
  }

  pararDeteccao();

  const detectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: scoreMinimo,
  });

  detectionInterval = setInterval(async () => {
    if (video.paused || video.ended || video.readyState < 2) return;

    try {
      const detections = await faceapi
        .detectAllFaces(video, detectorOptions)
        .withFaceLandmarks(true);

      // Redimensionar resultados para o tamanho do canvas
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Limpar canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (resizedDetections.length > 0) {
        // Desenhar bounding boxes
        resizedDetections.forEach((detection) => {
          const box = detection.detection.box;
          const score = detection.detection.score;

          ctx.strokeStyle = score > 0.7 ? '#10b981' : '#f59e0b';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          // Label de confiança
          ctx.fillStyle = ctx.strokeStyle;
          ctx.font = '14px Inter, sans-serif';
          ctx.fillText(
            `${Math.round(score * 100)}%`,
            box.x,
            box.y > 20 ? box.y - 6 : box.y + box.height + 18
          );
        });

        onFaceDetected?.(resizedDetections);
      } else {
        onFaceDetected?.(null);
      }
    } catch (error) {
      // Silenciar erros de detecção durante operação normal
      if (error.message !== 'input is empty') {
        console.warn('Erro na detecção:', error.message);
      }
    }
  }, intervalo);
}

export function pararDeteccao() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
}

export function modelosCarregados() {
  return modelsLoaded;
}
