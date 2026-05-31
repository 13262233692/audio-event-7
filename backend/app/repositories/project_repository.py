from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from ..models import Project, Annotation
from ..schemas import ProjectCreate
import uuid


class ProjectRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, project_data: ProjectCreate, audio_file_name: str, duration: float, sample_rate: int) -> Project:
        project = Project(
            name=project_data.name,
            audio_file_name=audio_file_name,
            duration=duration,
            sample_rate=sample_rate
        )
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def get_all(self) -> List[Project]:
        result = await self.db.execute(select(Project).order_by(Project.created_at.desc()))
        return result.scalars().all()

    async def get_by_id(self, project_id: uuid.UUID) -> Optional[Project]:
        result = await self.db.execute(select(Project).where(Project.id == project_id))
        return result.scalar_one_or_none()

    async def get_with_annotation_count(self, project_id: uuid.UUID) -> Optional[dict]:
        result = await self.db.execute(
            select(
                Project,
                func.count(Annotation.id).label("annotation_count")
            )
            .outerjoin(Annotation, Project.id == Annotation.project_id)
            .where(Project.id == project_id)
            .group_by(Project.id)
        )
        row = result.one_or_none()
        if row:
            project, count = row
            return {**project.__dict__, "annotation_count": count}
        return None

    async def get_all_with_counts(self) -> List[dict]:
        result = await self.db.execute(
            select(
                Project,
                func.count(Annotation.id).label("annotation_count")
            )
            .outerjoin(Annotation, Project.id == Annotation.project_id)
            .group_by(Project.id)
            .order_by(Project.created_at.desc())
        )
        return [
            {**project.__dict__, "annotation_count": count}
            for project, count in result.all()
        ]

    async def delete(self, project_id: uuid.UUID) -> bool:
        project = await self.get_by_id(project_id)
        if project:
            await self.db.delete(project)
            await self.db.commit()
            return True
        return False
