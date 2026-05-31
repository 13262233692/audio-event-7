from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..models import Label


class LabelRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> List[Label]:
        result = await self.db.execute(select(Label).order_by(Label.name.asc()))
        return result.scalars().all()
