from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services.export_service import ExportService
import uuid

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/{project_id}")
async def export_annotations(
    project_id: uuid.UUID,
    format: str = Query("json", pattern="^(json|csv)$"),
    include_confidence: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    service = ExportService(db)
    try:
        content, media_type, filename = await service.export_annotations(
            project_id, format, include_confidence
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename.encode('utf-8').decode('latin-1')}"
        }
    )
