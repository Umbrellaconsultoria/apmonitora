from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from services.image_utils import converter_base64_para_imagem, converter_bytes_para_imagem
from services.face_processor import detectar_rostos, extrair_vetor_caracteristicas, comparar_vetores_caracteristicas

router = APIRouter()

class RequisicaoBase64(BaseModel):
    imagem_base64: str

class RequisicaoComparacao(BaseModel):
    vetor_conhecido: List[float]
    vetor_candidato: List[float]
    tolerancia: Optional[float] = 0.6

@router.post("/detectar")
async def endpoint_detectar(requisicao: RequisicaoBase64):
    """
    Endpoint para detectar rostos em uma imagem enviada via base64.
    Retorna as coordenadas dos rostos encontrados.
    """
    try:
        imagem = converter_base64_para_imagem(requisicao.imagem_base64)
        rostos = detectar_rostos(imagem)
        return {"sucesso": True, "total_rostos": len(rostos), "rostos": rostos}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar imagem: {str(e)}")

@router.post("/extrair-caracteristicas")
async def endpoint_extrair_caracteristicas(requisicao: RequisicaoBase64):
    """
    Endpoint para gerar o vetor de características (embedding 128-d) a partir de uma imagem base64.
    """
    try:
        imagem = converter_base64_para_imagem(requisicao.imagem_base64)
        vetor = extrair_vetor_caracteristicas(imagem)
        if vetor is None:
            return {"sucesso": False, "mensagem": "Nenhum rosto detectado na imagem", "vetor": None}
        return {"sucesso": True, "vetor": vetor}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao extrair vetor: {str(e)}")

@router.post("/extrair-caracteristicas-arquivo")
async def endpoint_extrair_caracteristicas_arquivo(arquivo: UploadFile = File(...)):
    """
    Endpoint para gerar o vetor de características a partir de um arquivo enviado via multipart/form-data.
    """
    try:
        conteudo = await arquivo.read()
        imagem = converter_bytes_para_imagem(conteudo)
        vetor = extrair_vetor_caracteristicas(imagem)
        if vetor is None:
            return {"sucesso": False, "mensagem": "Nenhum rosto detectado no arquivo", "vetor": None}
        return {"sucesso": True, "vetor": vetor}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao processar arquivo: {str(e)}")

@router.post("/comparar")
async def endpoint_comparar(requisicao: RequisicaoComparacao):
    """
    Endpoint para comparar dois vetores de características faciais.
    """
    try:
        resultado = comparar_vetores_caracteristicas(
            requisicao.vetor_conhecido,
            requisicao.vetor_candidato,
            requisicao.tolerancia or 0.6
        )
        return {"sucesso": True, **resultado}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao comparar vetores: {str(e)}")
