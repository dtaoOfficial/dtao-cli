from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import get_db
# DTAO:ROUTER_IMPORTS

app = FastAPI(title="dtao-project")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DTAO:ROUTER_INCLUDES


@app.get("/health")
async def health(db=Depends(get_db)):
    try:
        await db.command("ping")
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "error", "database": "unreachable"}
