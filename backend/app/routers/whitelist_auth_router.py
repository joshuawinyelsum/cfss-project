from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from datetime import timedelta
import jwt
from passlib.context import CryptContext
from datetime import datetime

from app.database import get_db
from app.models import WhitelistStudent, WhitelistUser
from app.whitelist_schemas import WhitelistRegisterRequest, WhitelistLoginRequest

router = APIRouter(prefix="/auth", tags=["auth_whitelist"])

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Setup
SECRET_KEY = "super-secure-jwt-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register")
async def register_student(user_data: WhitelistRegisterRequest, db: Session = Depends(get_db)):
    # 1. Check if studentId exists in whitelist_students
    result = await db.execute(select(WhitelistStudent).filter(WhitelistStudent.student_id == user_data.studentId))
    whitelisted_student = result.scalars().first()
    
    if not whitelisted_student:
        raise HTTPException(status_code=403, detail="Not authorized to register")

    # 2. Check if student already registered (users table)
    user_result = await db.execute(select(WhitelistUser).filter(WhitelistUser.student_id == user_data.studentId))
    existing_student = user_result.scalars().first()
    
    if existing_student:
        raise HTTPException(status_code=400, detail="Student already registered")

    # Check if email is already taken
    email_result = await db.execute(select(WhitelistUser).filter(WhitelistUser.email == user_data.email))
    existing_email = email_result.scalars().first()
    
    if existing_email:
        raise HTTPException(status_code=400, detail="Email is already in use")

    # 3. Fetch student data from whitelist (already fetched as whitelisted_student)
    # 4. Hash password
    hashed_password = get_password_hash(user_data.password)

    # 5. Create new user
    new_user = WhitelistUser(
        student_id=whitelisted_student.student_id,
        name=whitelisted_student.name,
        program=whitelisted_student.program,
        level=whitelisted_student.level,
        email=user_data.email,
        password_hash=hashed_password,
        role="student"
    )
    
    db.add(new_user)
    await db.commit()

    # 6. Return success response
    return {"message": "Registration successful"}

@router.post("/login")
async def login(login_data: WhitelistLoginRequest, db: Session = Depends(get_db)):
    # Validate email
    result = await db.execute(select(WhitelistUser).filter(WhitelistUser.email == login_data.email))
    user = result.scalars().first()

    # Validate password
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Return JWT token
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "email": user.email}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }
