from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.detection import router as router_deteccao

app = FastAPI(
    title="apMonitora - Servico de Processamento Facial",
    description="Microservico Python em FastAPI para deteccao, extração de embeddings e matching de rostos.",
    version="1.0.0"
)

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas
app.include_router(router_deteccao, prefix="/face", tags=["Processamento Facial"])

@app.get("/health")
@app.get("/face/health")
def endpoint_saude():
    """
    Endpoint de verificação de saúde do serviço (Health check).
    """
    return {"status": "ok", "servico": "face-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
