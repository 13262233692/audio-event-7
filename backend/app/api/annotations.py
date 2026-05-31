from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas import Annotation, AnnotationUpdate, SuccessResponse
from ..services.annotation_service import AnnotationService
import uuid

router = APIRouter(prefix="/annotations", tags=["annotations"])


@router.get("/{annotation_id}", response_model=Annotation)
async def get_annotation(annotation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = AnnotationService(db)
    annotation = await service.get_annotation(annotation_id)
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return annotation


@router.put("/{annotation_id}", response_model=Annotation)
async def update_annotation(
    annotation_id: uuid.UUID,
    update_data: AnnotationUpdate,
    db: AsyncSession = Depends(get_db)
):
    service = AnnotationService(db)
    annotation = await service.update_annotation(annotation_id, update_data)
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return annotation


@router.delete("/{annotation_id}", response_model=SuccessResponse)
async def delete_annotation(annotation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = AnnotationService(db)
    success = await service.delete_annotation(annotation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return SuccessResponse()
