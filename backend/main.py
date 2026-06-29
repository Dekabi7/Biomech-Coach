from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import analysis, players, upload

app = FastAPI(title="BiomechCoach API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",       # Vite dev server
        "https://biomechcoach.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(analysis.router)
app.include_router(players.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "BiomechCoach API"}
