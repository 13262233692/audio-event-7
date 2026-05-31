from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from ..repositories.annotation_repository import AnnotationRepository
from ..schemas import AnnotationCreate, AnnotationUpdate, Annotation
import uuid


class AnnotationService:
    def __init__(self, db: AsyncSession):
        self.repository = AnnotationRepository(db)

    async def create_annotation(self, project_id: uuid.UUID, annotation_data: AnnotationCreate) -> Annotation:
        return await self.repository.create(project_id, annotation_data)

    async def get_annotations_by_project(self, project_id: uuid.UUID) -> List[Annotation]:
        return await self.repository.get_by_project_id(project_id)

    async def get_annotation(self, annotation_id: uuid.UUID) -> Optional[Annotation]:
        return await self.repository.get_by_id(annotation_id)

    async def update_annotation(self, annotation_id: uuid.UUID, update_data: AnnotationUpdate) -> Optional[Annotation]:
        return await self.repository.update(annotation_id, update_data)

    async def delete_annotation(self, annotation_id: uuid.UUID) -> bool:
        return await self.repository.delete(annotation_id)
