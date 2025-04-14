from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette import status

from . import models, schemas
from datetime import datetime
from .auth import get_password_hash

def create_admin_user(db: Session):
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        admin_user = models.User(
            username="admin",
            hashed_password=get_password_hash("admin"),
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
    return admin

def create_commercial_proposal(db: Session, proposal: schemas.CommercialProposalCreate, user_id: int):
    db_proposal = models.CommercialProposal(
        **proposal.dict(),
        created_at=datetime.now().isoformat(),
        user_id=user_id
    )
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    return db_proposal

def get_commercial_proposals(db: Session, skip: int = 0, limit: int = 100, user_id: int = None):
    query = db.query(models.CommercialProposal)
    if user_id:
        query = query.filter(models.CommercialProposal.user_id == user_id)
    return query.offset(skip).limit(limit).all()

def create_lsk_structure(db: Session, lsk: schemas.LskStructureCreate):
    db_lsk = models.LskStructure(**lsk.dict())
    db.add(db_lsk)
    db.commit()
    db.refresh(db_lsk)
    return db_lsk

# def create_lsk_structure(db: Session, lsk: schemas.LskStructureCreate):
#     # Проверяем существование КП
#     proposal = db.query(models.CommercialProposal) \
#         .filter(models.CommercialProposal.id == lsk.proposal_id) \
#         .first()
#     if not proposal:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Commercial proposal not found"
#         )
#
#     db_lsk = models.LskStructure(**lsk.dict())
#     db.add(db_lsk)
#     db.commit()
#     db.refresh(db_lsk)
#     return db_lsk

def get_lsk_structures(db: Session, proposal_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.LskStructure)\
        .filter(models.LskStructure.proposal_id == proposal_id)\
        .offset(skip).limit(limit).all()