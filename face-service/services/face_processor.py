import face_recognition
import numpy as np
from typing import List, Dict, Any, Optional

def detectar_rostos(imagem_rgb: np.ndarray) -> List[Dict[str, Any]]:
    """
    Detecta localizações de rostos na imagem informada (modelo HOG/CNN).
    Retorna uma lista de caixas delimitadoras (bounding boxes) com coordenadas top, right, bottom, left.
    """
    localizacoes = face_recognition.face_locations(imagem_rgb)
    rostos = []
    for top, right, bottom, left in localizacoes:
        rostos.append({
            "topo": top,
            "direita": right,
            "base": bottom,
            "esquerda": left
        })
    return rostos

def extrair_vetor_caracteristicas(imagem_rgb: np.ndarray) -> Optional[List[float]]:
    """
    Extrai o vetor de características (face embedding de 128 dimensões) do primeiro rosto encontrado na imagem.
    Retorna None se nenhum rosto for encontrado.
    """
    embeddings = face_recognition.face_encodings(imagem_rgb)
    if len(embeddings) > 0:
        return embeddings[0].tolist()
    return None

def comparar_vetores_caracteristicas(vetor_conhecido: List[float], vetor_candidato: List[float], tolerancia: float = 0.6) -> Dict[str, Any]:
    """
    Compara dois vetores de características (embeddings) e calcula a distância euclidiana entre eles.
    Retorna um dicionário indicando se houve correspondência e a distância calculada.
    """
    conhecido_arr = np.array(vetor_conhecido)
    candidato_arr = np.array(vetor_candidato)
    
    distancia = float(face_recognition.face_distance([conhecido_arr], candidato_arr)[0])
    correspondencia = bool(distancia <= tolerancia)
    confianca = float(max(0.0, 1.0 - distancia))
    
    return {
        "correspondencia": correspondencia,
        "distancia": distancia,
        "confianca": confianca
    }
