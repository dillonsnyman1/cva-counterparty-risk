import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.cva_engine import compute_cva
from app.models import CVARequest, CVAResponse

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

app = FastAPI(title="CVA Counterparty Credit Risk Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/cva/compute", response_model=CVAResponse)
async def run_cva(req: CVARequest) -> CVAResponse:
    if not req.swaps and not req.fx_forwards:
        raise HTTPException(status_code=422, detail="At least one trade is required")
    try:
        return compute_cva(req)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/health")
async def health():
    return {"status": "ok"}


from mangum import Mangum

handler = Mangum(app)
