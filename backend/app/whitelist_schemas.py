from pydantic import BaseModel, EmailStr

class WhitelistRegisterRequest(BaseModel):
    studentId: str
    email: EmailStr
    password: str

class WhitelistLoginRequest(BaseModel):
    email: EmailStr
    password: str
