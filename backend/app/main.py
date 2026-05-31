from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import settings, init_db
from .api.projects import router as projects_router
from .api.annotations import router as annotations_router
from .api.export import router as export_router
from .api.labels import router as labels_router
from .models import Label
from sqlalchemy.ext.asyncio import AsyncSession
from .database import AsyncSessionLocal
import uuid

app = FastAPI(
    title="Audio Annotation API",
    description="API for audio event annotation tool with YAMNet AI suggestions",
    version="1.0.0"
)

origins = settings.cors_origins.split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router, prefix="/api")
app.include_router(annotations_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(labels_router, prefix="/api")


@app.on_event("startup")
async def on_startup():
    await init_db()

    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(Label).limit(1))
        existing_label = result.scalar_one_or_none()

        if not existing_label:
            default_labels = [
                Label(id=uuid.uuid4(), name='狗叫', yamnet_classes='Dog, Bark', color='#ef4444'),
                Label(id=uuid.uuid4(), name='汽车鸣笛', yamnet_classes='Vehicle horn, Car horn', color='#f59e0b'),
                Label(id=uuid.uuid4(), name='雨声', yamnet_classes='Rain', color='#3b82f6'),
                Label(id=uuid.uuid4(), name='鸟鸣', yamnet_classes='Bird, Bird vocalization, Chirp, Tweet', color='#10b981'),
                Label(id=uuid.uuid4(), name='人声', yamnet_classes='Speech, Human voice, Conversation', color='#8b5cf6'),
                Label(id=uuid.uuid4(), name='背景音乐', yamnet_classes='Music, Background music, Musical instrument', color='#ec4899'),
                Label(id=uuid.uuid4(), name='脚步声', yamnet_classes='Footstep, Walking', color='#06b6d4'),
                Label(id=uuid.uuid4(), name='敲门声', yamnet_classes='Knock, Tap', color='#84cc16'),
                Label(id=uuid.uuid4(), name='警报声', yamnet_classes='Siren, Alarm, Emergency vehicle', color='#dc2626'),
                Label(id=uuid.uuid4(), name='笑声', yamnet_classes='Laughter, Giggle', color='#f472b6'),
            ]
            session.add_all(default_labels)
            await session.commit()


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
