from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from ..database import get_db
from ..schemas import Label
from ..repositories.label_repository import LabelRepository

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=List[Label])
async def get_labels(db: AsyncSession = Depends(get_db)):
    repository = LabelRepository(db)
    return await repository.get_all()
