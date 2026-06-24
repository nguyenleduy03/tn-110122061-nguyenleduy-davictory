from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, MetaData
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone

metadata = MetaData()
Base = declarative_base(metadata=metadata)


class AgentSession(Base):
    __tablename__ = "agent_sessions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    context = Column(JSON, nullable=True)
    active_agents = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class AgentTask(Base):
    __tablename__ = "agent_tasks"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=True)
    agent_type = Column(String(50), nullable=False)
    intent = Column(String(200), nullable=True)
    input_data = Column(JSON, nullable=True)
    status = Column(String(20), default="pending")
    result = Column(JSON, nullable=True)
    plan = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


async def create_tables():
    from db.session import get_engine
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
