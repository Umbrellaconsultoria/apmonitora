/**
 * Serviço de câmera — gerencia o stream da câmera do tablet.
 */
let stream = null;
let videoElement = null;

export async function iniciarCamera(video, facingMode = 'user') {
  videoElement = video;

  try {
    // Parar stream anterior se existir
    pararCamera();

    const constraints = {
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();

    return { success: true, stream };
  } catch (error) {
    console.error('Erro ao acessar câmera:', error);
    return { success: false, error: error.message };
  }
}

export function pararCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (videoElement) {
    videoElement.srcObject = null;
  }
}

/**
 * Captura um frame da câmera como Blob (JPEG).
 */
export function capturarFrame(video, qualidade = 0.85) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', qualidade);
  });
}

/**
 * Captura a região de um rosto detectado.
 */
export function capturarRosto(video, detection, padding = 40) {
  const canvas = document.createElement('canvas');
  const box = detection.detection.box;

  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const w = Math.min(video.videoWidth - x, box.width + padding * 2);
  const h = Math.min(video.videoHeight - y, box.height + padding * 2);

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, x, y, w, h, 0, 0, w, h);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
  });
}

export function cameraAtiva() {
  return stream !== null && stream.active;
}
