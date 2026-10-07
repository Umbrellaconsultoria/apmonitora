/**
 * Serviço de comunicação HTTP do Backend Node.js com o Microserviço Python (FastAPI) de Visão Computacional.
 */

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:8000';

/**
 * Envia uma imagem codificada em base64 para o microserviço Python para extrair o vetor de características faciais.
 * @param {string} imagemBase64 - Imagem em formato string base64.
 * @returns {Promise<Array<number>|null>} Retorna o array de 128 dimensões ou null se nenhum rosto for encontrado.
 */
export async function extrairVetorCaracteristicas(imagemBase64) {
  try {
    const response = await fetch(`${FACE_SERVICE_URL}/face/extrair-caracteristicas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagem_base64: imagemBase64 }),
    });

    if (!response.ok) {
      console.warn(`⚠️ Erro no face-service HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.sucesso && data.vetor) {
      return data.vetor;
    }
    return null;
  } catch (error) {
    console.error('❌ Falha ao comunicar com o face-service:', error.message);
    return null;
  }
}

/**
 * Compara dois vetores de características faciais (embeddings) via microserviço Python.
 * @param {Array<number>} vetorConhecido - Vetor de referência de uma pessoa cadastrada.
 * @param {Array<number>} vetorCandidato - Vetor da imagem capturada no evento.
 * @param {number} tolerancia - Limiar de distância euclidiana (padrão: 0.6).
 * @returns {Promise<{correspondencia: boolean, distancia: number, confianca: number}|null>}
 */
export async function compararVetoresCaracteristicas(vetorConhecido, vetorCandidato, tolerancia = 0.6) {
  try {
    const response = await fetch(`${FACE_SERVICE_URL}/face/comparar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vetor_conhecido: vetorConhecido,
        vetor_candidato: vetorCandidato,
        tolerancia,
      }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Falha ao comunicar com o face-service para comparação:', error.message);
    return null;
  }
}
