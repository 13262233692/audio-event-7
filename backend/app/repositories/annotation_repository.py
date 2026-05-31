from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from ..models import Annotation
from ..schemas import AnnotationCreate, AnnotationUpdate
import uuid


class AnnotationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, project_id: uuid.UUID, annotation_data: AnnotationCreate) -> Annotation:
        annotation = Annotation(
            project_id=project_id,
            start_time=annotation_data.start_time,
            end_time=annotation_data.end_time,
            label=annotation_data.label,
            confidence=annotation_data.confidence,
            source=annotation_data.source or "manual"
        )
        self.db.add(annotation)
        await self.db.commit()
        await self.db.refresh(annotation)
        return annotation

    async def get_by_project_id(self, project_id: uuid.UUID) -> List[Annotation]:
        result = await self.db.execute(
            select(Annotation)
            .where(Annotation.project_id == project_id)
            .order_by(Annotation.start_time.asc())
        )
        return result.scalars().all()

    async def get_by_id(self, annotation_id: uuid.UUID) -> Optional[Annotation]:
        result = await self.db.execute(select(Annotation).where(Annotation.id == annotation_id))
        return result.scalar_one_or_none()

    async def update(self, annotation_id: uuid.UUID, update_data: AnnotationUpdate) -> Optional[Annotation]:
        annotation = await self.get_by_id(annotation_id)
        if not annotation:
            return None

        if update_data.start_time is not None:
            annotation.start_time = update_data.start_time
        if update_data.end_time is not None:
            annotation.end_time = update_data.end_time
        if update_data.label is not None:
            annotation.label = update_data.label

        await self.db.commit()
        await self.db.refresh(annotation)
        return annotation

    async def delete(self, annotation_id: uuid.UUID) -> bool:
        annotation = await self.get_by_id(annotation_id)
        if annotation:
            await self.db.delete(annotation)
            await self.db.commit()
            return True
        return False
