from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime

class UserCreate(BaseModel):
    tg_id: int
    name: str
    avatar_path: str
    bio: str
    is_admin: Optional[bool] = False

class TaskTests(BaseModel):
    task_id: int
    input: str
    output: str
    test_type:str = "sample"

# Схема пользователя для ответа клиенту
class UserOut(BaseModel):
    id: int
    tg_id: int
    name: str
    avatar_path: str
    bio: str
    elo: int
    solved: int
    join_date: Optional[date] = None

    class Config:
        from_attributes = True

# Базовая схема задачи
class TaskCreate(BaseModel):
    title: str
    language: str
    description: str
    code: str
    difficulty: int
    tg_id: int  

# Схема задачи для ответа клиенту
class TaskOut(BaseModel):
    id: int
    title: str
    language: str
    description: str
    author_id: int
    difficulty: int
    status: str

    class Config:
        from_attributes = True

# Схема для решения задачи
class SolutionCreate(BaseModel):
    user_id: int
    task_id: int
    solution: str
    is_correct: Optional[bool] = None
    time_spent: Optional[datetime] = None

class MatchCreate(BaseModel):
    task_id: int
    player1_id: int
    is_active: bool = True

# Схема для ответа с матчем/соревнованием
class MatchOut(BaseModel):
    id: int
    task_id: int
    player1_id: int
    player2_id: Optional[int]
    is_active: bool
    winner_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    class Config:
        from_attributes = True