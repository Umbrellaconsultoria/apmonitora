import base64
import io
import numpy as np
from PIL import Image

def converter_base64_para_imagem(string_base64: str) -> np.ndarray:
    """
    Converte uma string codificada em base64 (com ou sem cabeçalho data:image/...)
    em uma imagem NumPy (formato RGB) utilizável pelo OpenCV e face_recognition.
    """
    if ',' in string_base64:
        string_base64 = string_base64.split(',')[1]
        
    bytes_imagem = base64.b64decode(string_base64)
    imagem_pil = Image.open(io.BytesIO(bytes_imagem)).convert('RGB')
    return np.array(imagem_pil)

def converter_bytes_para_imagem(bytes_imagem: bytes) -> np.ndarray:
    """
    Converte um array de bytes brutos de arquivo enviado via upload
    em um array NumPy em formato RGB.
    """
    imagem_pil = Image.open(io.BytesIO(bytes_imagem)).convert('RGB')
    return np.array(imagem_pil)
