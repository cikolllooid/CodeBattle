from typing import List
from fastapi import HTTPException, Depends, Request, APIRouter
from models import *
import uuid
from models import Base
from sqlalchemy.orm import Session
from schemas import *
from database import session_local, engine
import docker
import random
import tempfile, os, subprocess, string, re, json
from warap import wrap_code

client = docker.DockerClient(base_url="tcp://localhost:2375")

UPLOAD_DIR = "static/imgs_avatars"

router = APIRouter()

Base.metadata.create_all(bind=engine)

def get_db():
    db = session_local()
    try:
        yield db
    finally:
        db.close()

@router.get("/api/profile/{tg_id}", response_model=UserOut, status_code=200)
async def profile(
    tg_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    db_user = db.query(User).filter(User.tg_id == tg_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.avatar_path = f"{request.base_url}static/imgs_avatars/{tg_id}.jpg"
    return db_user

@router.get("/api/tasks", response_model=List[TaskOut])
async def get_tasks(
    min_difficulty: int, 
    max_difficulty: int, 
    db: Session = Depends(get_db)
):
    return db.query(Task)\
        .filter(
            Task.difficulty >= min_difficulty,
            Task.difficulty <= max_difficulty,
            Task.status == "approved"
        ).all()

def _compare(expected: str, actual: str) -> bool:
    e = (expected or "").strip()
    a = (actual or "").strip()
    # попытка JSON-равенства
    try:
        return json.loads(e) == json.loads(a)
    except:
        pass
    try:
        if "." in e or "." in a:
            return abs(float(e) - float(a)) < 1e-6
        return int(e) == int(a)
    except:
        pass
    def norm(s: str) -> str:
        return "\n".join(line.rstrip() for line in s.replace("\r\n","\n").replace("\r","\n").splitlines()).strip()
    return norm(e) == norm(a)

@router.get("/api/task/{task_id}", response_model=TaskOut)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.get("/api/profile/{tg_id}/extended", status_code=200)
async def extended_profile(
    tg_id: int,
    db: Session = Depends(get_db)
):
    db_user = db.query(User).filter(User.tg_id == tg_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    if db_user.avatar_path:
        file_name = os.path.basename(db_user.avatar_path)
        db_user.avatar_path = f"/static/imgs_avatars/{file_name}"
    
    solved_tasks = (
        db.query(Task)
        .join(Solution, Solution.task_id == Task.id)
        .filter(Solution.user_id == db_user.id)
        .distinct()
        .all()
    )
    
    # matches = db.query(Match).filter(
    #     (Match.player1_id == db_user.tg_id) | (Match.player2_id == db_user.tg_id)
    # ).order_by(Match.start_time.desc()).all()
    
    return {
        "user": db_user,
        "solved_tasks": solved_tasks,
        # "matches": matches,
        # "battle_wins": db_user.battle_wins
    }

# @router.post("/api/task/{task_id}/user/{user_id}/post_competition/{match_id}")
# async def post_solution(
#     task_id: int,
#     user_id: int,
#     match_id: int,
#     mega_task: SolutionCreate,
#     db: Session = Depends(get_db)
# ):
#     user = db.query(User).filter(User.id == user_id).first()
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")

#     myTest = db.query(Task).filter(Task.id == task_id).first()
#     if not myTest:
#         raise HTTPException(status_code=404, detail="Task not found")

#     solutionik = db.query(Solution).filter(
#         Solution.user_id == user_id,
#         Solution.task_id == task_id
#     ).first()

#     testiki = db.query(task_test).filter(task_test.task_id == task_id).order_by(task_test.id).all()
#     param_types = parse_parameters(myTest.code, myTest.language) if myTest.code else None

#     total = len(testiki)
#     passed = 0
#     results = []

#     for test in testiki:
#         input_data = test.input or ""
#         expected_output = test.output or ""
#         try:
#             actual_output = run_docker_code(
#                 lang=myTest.language,
#                 code=mega_task.solution,
#                 input_data=input_data,
#                 param_types=param_types,
#                 user_id=user_id
#             )
#         except Exception as e:
#             results.append({
#                 "test_id": getattr(test, "id", None),
#                 "input": input_data,
#                 "expected": expected_output,
#                 "actual": None,
#                 "passed": False,
#                 "error": str(e)
#             })
#             continue

#         ok = _compare(expected_output, actual_output)
#         if ok:
#             passed += 1

#         results.append({
#             "test_id": getattr(test, "id", None),
#             "input": input_data,
#             "expected": expected_output,
#             "actual": actual_output,
#             "passed": ok,
#             "error": None
#         })

#     if total > 0 and passed == total:
#         if not solutionik:
#             new_solution = Solution(
#                 user_id=user_id,
#                 task_id=task_id,
#                 solution=mega_task.solution,
#                 submitted_at=datetime.now(timezone.utc),
#                 is_correct=True
#             )
#             db.add(new_solution)

#             if myTest.difficulty == 1:
#                 user.elo += 15
#             elif myTest.difficulty == 2:
#                 user.elo += 30
#             elif myTest.difficulty == 3:
#                 user.elo += 45
#             elif myTest.difficulty == 4:
#                 user.elo += 50
#             elif myTest.difficulty == 5:
#                 user.elo += 65

#             user.solved = (user.solved or 0) + 1

#         match = db.query(Match).filter(Match.id == match_id).first()
#         if not match:
#             raise HTTPException(status_code=404, detail="Match not found")

#         match.winner_id = user_id
#         match.is_active = False
#         match.end_time=datetime.now(timezone.utc)
#         user.battle_wins = (user.battle_wins or 0) + 1

#         db.commit()
#         db.refresh(user)
#         db.refresh(match)
#     else:
#         db.commit()

#     return {"status": "done", "total": total, "passed": passed, "results": results}


@router.post("/api/task/{task_id}/user/{user_id}/post")
async def post_solution(task_id: int, user_id: int, mega_task: SolutionCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    solutionik = db.query(Solution).filter(
        Solution.user_id == user_id,
        Solution.task_id == task_id
    ).first()

    
    testiki = db.query(task_test).filter(task_test.task_id == task_id).order_by(task_test.id).all()
    myTest = db.query(Task).filter(Task.id == task_id).first()

    if not testiki:
        raise HTTPException(status_code=404, detail="Task not found")

    param_types = parse_parameters(myTest.code, myTest.language)

    total = len(testiki)
    passed = 0
    results = []

    for test in testiki:
        input_data = test.input or ""
        expected_output = test.output or ""
        try:
            actual_output = run_docker_code(
                lang=myTest.language,
                code=mega_task.solution,
                input_data=input_data,
                param_types=param_types,
                user_id=user_id
            )
        except Exception as e:
            results.append({
                "test_id": getattr(test, "id", None),
                "input": input_data,
                "expected": expected_output,
                "actual": None,
                "passed": False,
                "error": str(e)
            })
            continue

        ok = _compare(expected_output, actual_output)
        if ok:
            passed += 1

        results.append({
            "test_id": getattr(test, "id", None),
            "input": input_data,
            "expected": expected_output,
            "actual": actual_output,
            "passed": ok,
            "error": None
        })
    if passed == total:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if total > 0 and passed == total:
            if not solutionik:
                new_solution = Solution(
                    user_id=user_id,
                    task_id=task_id,
                    solution=mega_task.solution,
                    submitted_at=datetime.now(timezone.utc),
                    is_correct=True
                )
                db.add(new_solution)

                if myTest.difficulty == 1:
                    user.elo += 15
                elif myTest.difficulty == 2:
                    user.elo += 30
                elif myTest.difficulty == 3:
                    user.elo += 45
                elif myTest.difficulty == 4:
                    user.elo += 50
                elif myTest.difficulty == 5:
                    user.elo += 65

                user.solved = (user.solved or 0) + 1
        db.commit()
        db.refresh(user)

    return {"status": "done", "total": total, "passed": passed, "results": results}

@router.get("/api/solutions/correct/{tg_id}/{task_id}", status_code=200)
async def correct_solutions_for_task(
    tg_id: int,
    task_id: int,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.tg_id == tg_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    solution = (
        db.query(Solution)
        .filter(Solution.user_id == user.id, Solution.task_id == task_id)
        .first()
    )

    if not solution:
        solution = Solution(
            user_id=user.id,
            task_id=task_id,
            solution="-- viewed correct solution --",
            is_correct=True,
            submitted_at=datetime.now(timezone.utc)
        )
        db.add(solution)
        db.commit()
        db.refresh(solution)

    all_correct_solutions = (
        db.query(Solution, User.name)
        .join(User, User.id == Solution.user_id)
        .filter(Solution.task_id == task_id, Solution.is_correct == True)
        .all()
    )

    return [
        {
            "username": sol[1],
            "solution": sol[0].solution,
        }
        for sol in all_correct_solutions
    ]



@router.post("/api/create_task")
async def create_task(respons: TaskCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.tg_id == respons.tg_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.elo < 1000:
        raise HTTPException(status_code=400, detail="У вас недостаточно ELO чтобы создать задание")

    task = Task(
        title=respons.title,
        language=respons.language,
        description=respons.description,
        code=respons.code,
        author_id=user.id,
        difficulty=respons.difficulty,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

LANG_CONFIG = {
    "python": {
        "image": "python:3.11-slim",
        "file": "/workspace/solution.py",
        "run": "python /workspace/solution.py"
    },
    "js": {
        "image": "node:20-slim",
        "file": "/workspace/solution.js",
        "run": "node /workspace/solution.js"
    },
    "c": {
        "image": "gcc:12",
        "file": "/workspace/solution.c",
        "compile": "gcc /workspace/solution.c -o /workspace/solution",
        "run": "/workspace/solution"
    },
    "cpp": {
        "image": "gcc:12",
        "file": "/workspace/solution.cpp",
        "compile": "g++ /workspace/solution.cpp -o /workspace/solution",
        "run": "/workspace/solution"
    },
    "rust": {
        "image": "rust:1.72",
        "file": "/workspace/solution.rs",
        "compile": "rustc /workspace/solution.rs -o /workspace/solution",
        "run": "/workspace/solution"
    },
    "go": {
        "image": "golang:1.21",
        "file": "/workspace/solution.go",
        "run": "go run /workspace/solution.go"
    }
}

def run_docker_code(lang: str, code: str, input_data: str, param_types: list, user_id: int) -> str:
    if lang not in LANG_CONFIG:
        raise ValueError(f"Unsupported language: {lang}")
    
    config = LANG_CONFIG[lang]
    wrapped_code = wrap_code(lang, code, param_types)


    temp_dir = os.path.join(tempfile.gettempdir(), f"code_exec_{user_id}")
    os.makedirs(temp_dir, exist_ok=True)

    try:
        file_path = os.path.join(temp_dir, os.path.basename(config["file"]))
        with open(file_path, "w") as f:
            f.write(wrapped_code)

        compile_cmd = config.get("compile", "")
        run_cmd = config["run"]
        full_cmd = f"{compile_cmd} && {run_cmd}" if compile_cmd else run_cmd

        docker_cmd = [
            'docker', 'run', '-i', '--rm',
            '-v', f'{temp_dir}:/workspace',
            '-w', '/workspace',
            '--network', 'none',
            '--memory', '100m',
            config["image"],
            'sh', '-c', full_cmd
        ]

        process = subprocess.Popen(
            docker_cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(
            input=input_data + "\n",
            timeout=10
        )

        if process.returncode != 0:
            error_msg = stderr.strip() or f"Container exited with code {process.returncode}"
            raise RuntimeError(error_msg)

        return stdout.strip()
    
    except subprocess.TimeoutExpired:
        process.kill()
        stdout, stderr = process.communicate()
        raise TimeoutError("Container execution timed out")
    
    except Exception as e:
        raise RuntimeError(f"Container execution failed: {str(e)}")
    
    finally:
        # Удаляем временную директорию после использования
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

def parse_parameters(code: str, lang: str) -> list:
    """Анализирует код и возвращает список типов параметров функции"""

    if lang == "python":
        match = re.search(r"def\s+\w+\s*\((.*?)\)\s*:", code)
        if not match:
            return []
        params_str = match.group(1).strip()
        if not params_str:
            return []
        params = []
        for param in params_str.split(","):
            param = param.strip()
            if ":" in param:  # param: type
                type_part = param.split(":")[1].strip()
                if "=" in type_part:  # убираем значения по умолчанию
                    type_part = type_part.split("=")[0].strip()
                params.append(type_part)
            else:
                if "=" in param:  # без аннотации, но с дефолтом
                    param = param.split("=")[0].strip()
                params.append("any")
        return params

    elif lang in ["c", "cpp", "c++", "java"]:
        match = re.search(r"\w+\s+\w+\s*\((.*?)\)\s*\{", code, re.DOTALL)
        if not match:
            return []
        params_str = match.group(1).strip()
        if not params_str:
            return []
        params = []
        for param in params_str.split(","):
            param = param.strip()
            if not param:
                continue
            # убираем имя переменной
            parts = param.split()
            if len(parts) > 1:
                type_part = " ".join(parts[:-1])
            else:
                type_part = parts[0]
            params.append(type_part)
        return params

    elif lang == "js":
        match = re.search(r"function\s+\w+\s*\((.*?)\)\s*\{", code)
        if match:
            params_str = match.group(1).strip()
            if not params_str:
                return []
            return ["any"] * len(params_str.split(","))
        return []

    elif lang == "rust":
        match = re.search(r"fn\s+\w+\s*\((.*?)\)", code)
        if not match:
            return []
        params_str = match.group(1).strip()
        if not params_str:
            return []
        params = []
        for param in params_str.split(","):
            if ":" in param:
                type_part = param.split(":")[1].strip()
                params.append(type_part)
            else:
                params.append("any")
        return params

    elif lang == "go":
        match = re.search(r"func\s+\w+\s*\((.*?)\)", code)
        if not match:
            return []
        params_str = match.group(1).strip()
        if not params_str:
            return []
        params = []
        for param in params_str.split(","):
            parts = param.strip().split()
            if len(parts) == 2:  # name type
                params.append(parts[1])
            elif len(parts) == 1:  # только тип
                params.append(parts[0])
            else:
                params.append("any")
        return params

    return []

def generate_inputs(param_types: list) -> str:
    """Генерирует входные данные на основе типов параметров"""
    inputs = []
    for param_type in param_types:
        param_type = param_type.lower()
        
        if "int" in param_type:
            inputs.append(str(random.randint(-100, 100)))
        elif "float" in param_type or "double" in param_type:
            inputs.append(f"{random.uniform(-10.0, 10.0):.4f}")
        elif "str" in param_type or "string" in param_type:
            length = random.randint(1, 20)
            inputs.append(''.join(random.choices(string.ascii_letters, k=length)))
        elif "list" in param_type or "array" in param_type:
            length = random.randint(1, 5)
            items = [str(random.randint(1, 100)) for _ in range(length)]
            inputs.append(" ".join(items))
        elif "bool" in param_type:
            inputs.append(random.choice(["true", "false"]))
        else:
            # По умолчанию генерируем int
            inputs.append(str(random.randint(1, 100)))
    
    return " ".join(inputs)

@router.post("/api/create_tests/{user_id}")
async def create_test(response: TaskTests, user_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == response.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    param_types = parse_parameters(task.code, task.language)
    
    generated_tests = 0
    for _ in range(50):
        try:
            input_data = generate_inputs(param_types)
            
            output = run_docker_code(
                lang=task.language,
                code=task.code,
                input_data=input_data,
                param_types=param_types,
                user_id=user_id
            )
            
            new_test = task_test(
                task_id=response.task_id,
                input=input_data,
                output=output,
                test_type="hidden"
            )
            db.add(new_test)
            generated_tests += 1
        
        except Exception as e:
            print(f"Test generation failed: {str(e)}")
            continue

    db.commit()
    return {"status": "success", "generated_tests": generated_tests}

@router.get("/api/leaderboard", response_model=List[UserOut])
async def get_leaderboard(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.elo.desc()).limit(10).all()

# @router.get("/api/competitions", response_model=List[MatchOut])
# async def get_competitions(db: Session = Depends(get_db)):
#     return db.query(Match).filter(Match.is_active == True).all()

# @router.post("/api/competitions/create")
# async def create_competition(matchik: MatchCreate, db: Session = Depends(get_db)):
#     task = db.query(Task).filter(Task.id == matchik.task_id).first()
#     if not task:
#         raise HTTPException(status_code=404, detail="Task not found")
#     user = db.query(User).filter(User.tg_id == matchik.player1_id)
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")

#     new_match = Match(
#         task_id=matchik.task_id,
#         player1_id=matchik.player1_id,
#         is_active=True,
#         start_time=datetime.now(timezone.utc)
#     )

#     db.add(new_match)
#     db.commit()

# @router.post("/api/competitions/leave/{comp_id}/player/{id}")
# async def leave_player_competition(comp_id: int, id: int, db:Session = Depends(get_db)):
#     compet = db.query(Match).filter(Match.id == comp_id).first()
#     if not compet:
#         raise HTTPException(status_code=404, detail="Competition not found")
#     user = db.query(User).filter(User.tg_id == id).first()
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found")
#     if id == compet.player1_id:
#         compet.is_active = False
#     else:
#         compet.player2_id = None

#     compet.end_time=datetime.now(timezone.utc)
#     db.commit()

# @router.post("/api/competitions/join/{competition_id}/{user_id}", response_model=MatchOut)
# async def join_competition(user_id: int, competition_id: int, db: Session = Depends(get_db)):
#     competition = db.query(Match).filter(
#         Match.id == competition_id,
#         Match.player1_id.isnot(None),
#         Match.player2_id.is_(None)
#     ).first()

#     if not competition:
#         raise HTTPException(status_code=404, detail="Свободного слота нет или матч не найден")

#     if competition.player1_id == user_id:
#         raise HTTPException(status_code=400, detail="Вы уже участвуете в этом матче")

#     competition.player2_id = user_id
#     db.commit()
#     db.refresh(competition)

#     return competition  # <- вот это важно
