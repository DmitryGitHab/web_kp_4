from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import Annotated, List

from . import models, schemas
from .database import SessionLocal, engine
from .calculations import perform_calculations

models.Base.metadata.create_all(bind=engine)

# Настройки аутентификации
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

app.mount("/static", StaticFiles(directory="frontend/static"), name="static")
templates = Jinja2Templates(directory="frontend/templates")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def authenticate_user(db, username: str, password: str):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
        current_user: Annotated[schemas.User, Depends(get_current_user)]
):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# Создаем администратора при старте
def create_admin_user(db: Session):
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        admin_user = models.User(
            username="admin",
            hashed_password=get_password_hash("admin"),
            is_active=True,
            is_admin=True
        )
        db.add(admin_user)
        db.commit()


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    create_admin_user(db)
    db.close()


@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me/", response_model=schemas.User)
async def read_users_me(
        current_user: Annotated[schemas.User, Depends(get_current_active_user)]
):
    return current_user


@app.post("/proposals/", response_model=schemas.Proposal)
async def create_proposal(
        proposal: schemas.ProposalCreate,
        current_user: Annotated[schemas.User, Depends(get_current_active_user)],
        db: Session = Depends(get_db)
):
    db_proposal = models.Proposal(
        title=proposal.title,
        description=proposal.description,
        created_at=datetime.now().isoformat(),
        user_id=current_user.id
    )
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    return db_proposal


@app.get("/proposals/", response_model=List[schemas.Proposal])
async def read_proposals(
        current_user: Annotated[schemas.User, Depends(get_current_active_user)],
        db: Session = Depends(get_db)
):
    proposals = db.query(models.Proposal).filter(models.Proposal.user_id == current_user.id).all()
    return proposals


@app.post("/lsk/", response_model=schemas.LskStructure)
async def create_lsk(
        lsk: schemas.LskStructureCreate,
        current_user: Annotated[schemas.User, Depends(get_current_active_user)],
        db: Session = Depends(get_db)
):
    # Проверяем, что предложение принадлежит пользователю
    proposal = db.query(models.Proposal).filter(
        models.Proposal.id == lsk.proposal_id,
        models.Proposal.user_id == current_user.id
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Выполняем расчеты
    calculation_data = lsk.dict()
    results = perform_calculations(calculation_data)

    # Создаем структуру
    db_lsk = models.LskStructure(
        **calculation_data,
        **results
    )
    db.add(db_lsk)
    db.commit()
    db.refresh(db_lsk)
    return db_lsk


@app.get("/lsk/{proposal_id}", response_model=List[schemas.LskStructure])
async def read_lsk_structures(
        proposal_id: int,
        current_user: Annotated[schemas.User, Depends(get_current_active_user)],
        db: Session = Depends(get_db)
):
    # Проверяем, что предложение принадлежит пользователю
    proposal = db.query(models.Proposal).filter(
        models.Proposal.id == proposal_id,
        models.Proposal.user_id == current_user.id
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    lsk_structures = db.query(models.LskStructure).filter(
        models.LskStructure.proposal_id == proposal_id
    ).all()
    return lsk_structures

@app.post("/calculate/", response_model=dict)
async def calculate_lsk(data: dict):
    try:
        # Выполняем расчеты
        results = perform_calculations(data)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})