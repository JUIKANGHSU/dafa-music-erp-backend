from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings

_is_supabase = "supabase" in settings.SQLALCHEMY_DATABASE_URI or "pooler.supabase" in settings.SQLALCHEMY_DATABASE_URI

engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    echo=True,
    future=True,
    connect_args={"ssl": "require", "statement_cache_size": 0} if _is_supabase else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    autoflush=False,
    expire_on_commit=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
