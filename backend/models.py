from sqlalchemy import (
    Column, Integer, String, Boolean, Date, Text, TIMESTAMP,
    ForeignKey, BigInteger, TEXT
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base
from sqlalchemy.sql import func


# Пользователи
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tg_id = Column(BigInteger, unique=True, nullable=False)

    avatar_path = Column(String(255), nullable=False)
    name = Column(String(50), nullable=False)
    bio = Column(String(230), nullable=False)

    elo = Column(Integer, default=200)
    is_admin = Column(Boolean, default=False)
    solved = Column(Integer, default=0)
    battle_wins = Column(Integer, default=0)

    join_date = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # связи
    tasks = relationship("Task", back_populates="author", cascade="all, delete-orphan")
    solutions = relationship("Solution", back_populates="user", cascade="all, delete-orphan")
    matches_as_player1 = relationship("Match", back_populates="player1", foreign_keys="Match.player1_id")
    matches_as_player2 = relationship("Match", back_populates="player2", foreign_keys="Match.player2_id")

# Задачи
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    language = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    code = Column(TEXT, nullable=False)

    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    difficulty = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")  # pending / approved / rejected

    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # связи
    author = relationship("User", back_populates="tasks")
    solutions = relationship("Solution", back_populates="task", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="task", cascade="all, delete-orphan")

class task_test(Base):
    __tablename__ = "task_tests"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    input = Column(String(255), nullable=False)
    output = Column(String(255), nullable=False)
    test_type = Column(String(10), nullable=False)

# Решения
class Solution(Base):
    __tablename__ = "solutions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    solution = Column(TEXT, nullable=True)

    is_correct = Column(Boolean)
    submitted_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # связи
    user = relationship("User", back_populates="solutions")
    task = relationship("Task", back_populates="solutions")


# Матчи / соревнования
class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)

    player1_id = Column(BigInteger, ForeignKey("users.tg_id", ondelete="CASCADE"), nullable=False)
    player2_id = Column(BigInteger, ForeignKey("users.tg_id", ondelete="CASCADE"), nullable=True)

    is_active = Column(Boolean, default=True)
    winner_id = Column(Integer, ForeignKey("users.id"))
    start_time = Column(TIMESTAMP(timezone=True), server_default=func.now())
    end_time = Column(TIMESTAMP)

    # связи
    task = relationship("Task", back_populates="matches")
    player1 = relationship("User", back_populates="matches_as_player1", foreign_keys=[player1_id])
    player2 = relationship("User", back_populates="matches_as_player2", foreign_keys=[player2_id])
    winner = relationship("User", foreign_keys=[winner_id])git init