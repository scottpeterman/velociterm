from fastapi import APIRouter, HTTPException, Response, Depends, status, Cookie, Request
from passlib.context import CryptContext
from starlette.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from datetime import timedelta, datetime
import jwt
from fastapi.templating import Jinja2Templates

# LDAP Configuration
LDAP_SERVER = 'ldap://your-ldap-server.com'
LDAP_BASE_DN = 'DC=example,DC=com'
# Create APIRouter instance
router = APIRouter()

# JWT and Security Configuration
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Jinja2 templates
templates = Jinja2Templates(directory="velociterm/templates")
class Login(BaseModel):
    username: str
    password: str

# Utility function to verify passwords
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Utility function to hash passwords
def get_password_hash(password):
    return pwd_context.hash(password)

# JWT Utility Function
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Dummy LDAP authentication function
def authenticate_ldap(username: str, password: str):
    return True  # Replace with actual LDAP logic

# Login route that sets JWT as an HTTP-only cookie
@router.post("/login")
async def login(login_data: Login, response: Response):
    username = login_data.username
    password = login_data.password
    if authenticate_ldap(username, password):
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": username},
            expires_delta=access_token_expires
        )
        response = JSONResponse(
            content={
                "access_token": access_token,  # Include token in response
                "message": "Login successful"
            }
        )
        # Also set as HTTP-only cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=False,  # Set to True in production
            samesite="lax"
        )
        return response
    else:
        raise HTTPException(
            status_code=400,
            detail="Incorrect username or password"
        )
# Logout route
@router.get("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})  # Remove the ../templates/
