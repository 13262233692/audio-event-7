from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./audio_annotation.db"
    upload_dir: str = str(Path(__file__).parent.parent / "uploads")
    max_file_size: int = 100 * 1024 * 1024
    cors_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()

Base = declarative_base()

connect_args = {}
if "sqlite" in settings.database_url:
    connect_args["check_same_thread"] = False

engine = create_async_engine(settings.database_url, echo=True, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
