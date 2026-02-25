"""
Auth Router — логин, управление пользователями

POST /api/v1/auth/login       — логин, получить JWT
GET  /api/v1/auth/me          — текущий пользователь
POST /api/v1/auth/users       — создать пользователя (только админ)
GET  /api/v1/auth/users       — список пользователей (только админ)
DELETE /api/v1/auth/users/{id} — удалить пользователя (только админ)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.engine import get_db
from backend.database.models import User
from backend.database.schemas import UserCreate, UserResponse, UserLogin, Token
from backend.auth.security import hash_password, verify_password, create_access_token
from backend.auth.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Аутентификация — возвращает JWT access token."""
    result = await db.execute(
        select(User).where(User.username == data.username, User.is_active.is_(True))
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )

    token = create_access_token({
        "sub": user.id,
        "username": user.username,
        "role": user.role,
    })
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Текущий аутентифицированный пользователь."""
    return user


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Создать нового пользователя (только админ)."""
    existing = await db.execute(select(User).where(User.username == data.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Пользователь '{data.username}' уже существует")

    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        role=data.role,
        full_name=data.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Список всех пользователей (только админ)."""
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Деактивировать пользователя (только админ). Нельзя удалить себя."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.is_active = False
    await db.commit()
