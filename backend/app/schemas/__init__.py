from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    id: uuid.UUID
    audio_file_name: str
    duration: float
    sample_rate: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectWithAnnotationCount(Project):
    annotation_count: int = 0


class AnnotationBase(BaseModel):
    start_time: float = Field(..., ge=0)
    end_time: float = Field(..., gt=0)
    label: str = Field(..., min_length=1, max_length=100)
    confidence: Optional[float] = Field(None, ge=0, le=1)
    source: Optional[str] = Field("manual", pattern="^(manual|ai-suggested)$")


class AnnotationCreate(AnnotationBase):
    pass


class AnnotationUpdate(BaseModel):
    start_time: Optional[float] = Field(None, ge=0)
    end_time: Optional[float] = Field(None, gt=0)
    label: Optional[str] = Field(None, min_length=1, max_length=100)


class Annotation(AnnotationBase):
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LabelBase(BaseModel):
    name: str
    yamnet_classes: Optional[str] = None
    color: str = "#3b82f6"


class Label(LabelBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


class SuccessResponse(BaseModel):
    success: bool = True


class TagSuggestion(BaseModel):
    label: str
    confidence: float
    yamnet_class: str
