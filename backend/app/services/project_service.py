from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from ..repositories.project_repository import ProjectRepository
from ..schemas import ProjectCreate, Project, ProjectWithAnnotationCount
import soundfile as sf
import os
from pathlib import Path
import uuid
from ..database import settings


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.repository = ProjectRepository(db)
        self.upload_dir = Path(settings.upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def create_project(self, project_data: ProjectCreate, audio_file: bytes, filename: str) -> Project:
        file_ext = os.path.splitext(filename)[1].lower()
        new_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = self.upload_dir / new_filename

        with open(file_path, "wb") as f:
            f.write(audio_file)

        try:
            data, sample_rate = sf.read(str(file_path))
            duration = len(data) / sample_rate if sample_rate > 0 else 0
        except Exception:
            duration = 0
            sample_rate = 16000

        return await self.repository.create(project_data, new_filename, duration, sample_rate)

    async def get_all_projects(self) -> List[dict]:
        return await self.repository.get_all_with_counts()

    async def get_project(self, project_id: uuid.UUID) -> Optional[Project]:
        return await self.repository.get_by_id(project_id)

    async def get_project_with_count(self, project_id: uuid.UUID) -> Optional[dict]:
        return await self.repository.get_with_annotation_count(project_id)

    async def delete_project(self, project_id: uuid.UUID) -> bool:
        project = await self.repository.get_by_id(project_id)
        if project:
            file_path = self.upload_dir / project.audio_file_name
            if file_path.exists():
                os.remove(file_path)
            return await self.repository.delete(project_id)
        return False

    def get_audio_path(self, audio_file_name: str) -> Path:
        return self.upload_dir / audio_file_name
