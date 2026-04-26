from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings

# Create the async engine
# echo=True will log SQL queries to console (useful for dev)
engine = create_async_engine(
    settings.SQLALCHEMY_DATABASE_URI, 
    echo=True, 
    future=True
)

# Create the session factory
AsyncSessionLocal = async_sessionmaker(
    engine, 
    autoflush=False, 
    expire_on_commit=False,
)

# Dependency to get DB session in endpoints
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
