from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import ValidationError
from . import models, schemas
from .database import SessionLocal, engine
from .calculations import perform_calculations
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

models.Base.metadata.create_all(bind=engine)

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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = error["loc"][-1]
        message = error["msg"]
        errors.append({"field": field, "message": message, "type": error["type"]})

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": errors
        },
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    errors = []
    for error in exc.errors():
        field = error["loc"][-1]
        message = error["msg"]
        errors.append({"field": field, "message": message, "type": error["type"]})

    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": errors
        },
    )


@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/calculate/")
async def calculate(data: schemas.CalculationInput, db: Session = Depends(get_db)):
    try:
        results = perform_calculations(data.dict())

        db_data = data.dict()
        db_data.update(results)
        db_calculation = models.Calculation(**db_data)

        db.add(db_calculation)
        db.commit()
        db.refresh(db_calculation)

        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/calculations/")
async def get_calculations(db: Session = Depends(get_db)):
    return db.query(models.Calculation).all()