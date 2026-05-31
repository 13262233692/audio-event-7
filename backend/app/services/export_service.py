from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from ..repositories.annotation_repository import AnnotationRepository
from ..repositories.project_repository import ProjectRepository
from ..models import Annotation, Project
import uuid
import json
import csv
from io import StringIO


class ExportService:
    def __init__(self, db: AsyncSession):
        self.annotation_repo = AnnotationRepository(db)
        self.project_repo = ProjectRepository(db)

    async def export_annotations(self, project_id: uuid.UUID, format: str = "json", include_confidence: bool = True) -> tuple[str, str, str]:
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")

        annotations = await self.annotation_repo.get_by_project_id(project_id)

        if format == "csv":
            content = self._export_csv(annotations, include_confidence)
            media_type = "text/csv"
            filename = f"{project.name}_annotations.csv"
        else:
            content = self._export_json(project, annotations, include_confidence)
            media_type = "application/json"
            filename = f"{project.name}_annotations.json"

        return content, media_type, filename

    def _export_json(self, project: Project, annotations: List[Annotation], include_confidence: bool) -> str:
        data = {
            "project": {
                "id": str(project.id),
                "name": project.name,
                "audio_file": project.audio_file_name,
                "duration": project.duration,
                "sample_rate": project.sample_rate
            },
            "annotations": [
                {
                    "id": str(a.id),
                    "start_time": round(a.start_time, 3),
                    "end_time": round(a.end_time, 3),
                    "duration": round(a.end_time - a.start_time, 3),
                    "label": a.label,
                    **({"confidence": round(a.confidence, 4)} if include_confidence and a.confidence else {}),
                    "source": a.source
                }
                for a in annotations
            ],
            "total_annotations": len(annotations)
        }
        return json.dumps(data, indent=2, ensure_ascii=False)

    def _export_csv(self, annotations: List[Annotation], include_confidence: bool) -> str:
        output = StringIO()
        fieldnames = ["id", "start_time", "end_time", "duration", "label", "source"]
        if include_confidence:
            fieldnames.insert(5, "confidence")

        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for a in annotations:
            row = {
                "id": str(a.id),
                "start_time": round(a.start_time, 3),
                "end_time": round(a.end_time, 3),
                "duration": round(a.end_time - a.start_time, 3),
                "label": a.label,
                "source": a.source
            }
            if include_confidence:
                row["confidence"] = round(a.confidence, 4) if a.confidence else ""
            writer.writerow(row)

        return output.getvalue()
