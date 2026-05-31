from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from ..database import get_db
from ..schemas import Project, ProjectCreate, SuccessResponse, Annotation, AnnotationCreate, AnnotationUpdate
from ..services.project_service import ProjectService
from ..services.annotation_service import AnnotationService
import uuid

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=List[dict])
async def get_projects(db: AsyncSession = Depends(get_db)):
    service = ProjectService(db)
    return await service.get_all_projects()


@router.post("", response_model=Project)
async def create_project(
    name: str = Form(...),
    audio_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not audio_file.filename or not audio_file.filename.lower().endswith('.wav'):
        raise HTTPException(status_code=400, detail="Only WAV files are allowed")

    content = await audio_file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    service = ProjectService(db)
    project_data = ProjectCreate(name=name)
    return await service.create_project(project_data, content, audio_file.filename)


@router.get("/{project_id}", response_model=dict)
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = ProjectService(db)
    project = await service.get_project_with_count(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", response_model=SuccessResponse)
async def delete_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = ProjectService(db)
    success = await service.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return SuccessResponse()


@router.get("/{project_id}/audio")
async def get_audio_file(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    service = ProjectService(db)
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    audio_path = service.get_audio_path(project.audio_file_name)
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        audio_path,
        media_type="audio/wav",
        filename=project.audio_file_name
    )


@router.get("/{project_id}/annotations", response_model=List[Annotation])
async def get_annotations(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = AnnotationService(db)
    return await service.get_annotations_by_project(project_id)


@router.post("/{project_id}/annotations", response_model=Annotation)
async def create_annotation(
    project_id: uuid.UUID,
    annotation_data: AnnotationCreate,
    db: AsyncSession = Depends(get_db)
):
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if annotation_data.end_time <= annotation_data.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")
    if annotation_data.end_time > project.duration:
        raise HTTPException(status_code=400, detail="End time exceeds audio duration")

    service = AnnotationService(db)
    return await service.create_annotation(project_id, annotation_data)
