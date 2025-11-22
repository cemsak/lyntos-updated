from fastapi import APIRouter
from ..controllers import kurgan_controller

router = APIRouter(prefix="/v1")

router.include_router(kurgan_controller.router, prefix="/kurgan", tags=["kurgan"])
