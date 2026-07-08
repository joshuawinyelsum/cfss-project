import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.auth import get_current_admin
from app.models import WhitelistEntry, WhitelistV2, Survey, Community, User

router = APIRouter(prefix="/admin/export", tags=["admin", "export"])

@router.get("/students")
async def export_students(db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    """Export students as CSV using batching."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["student_id", "name", "email", "program", "level", "is_verified", "created_at"])
    
    query = select(User).filter(User.role == "student").order_by(User.id)
    
    batch_size = 1000
    offset = 0
    
    while True:
        result = await db.execute(query.limit(batch_size).offset(offset))
        users = result.scalars().all()
        if not users:
            break
        
        for user in users:
            created_at_str = user.created_at.isoformat() if user.created_at else ""
            writer.writerow([
                user.student_id,
                user.name,
                user.email,
                user.program,
                user.level,
                user.is_verified,
                created_at_str
            ])
            
        offset += batch_size

    headers = {
        "Content-Disposition": "attachment; filename=students_export.csv"
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

@router.get("/whitelist/{whitelist_id}")
async def export_whitelist(whitelist_id: str, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    """Export a whitelist as CSV with flattened metadata."""
    result = await db.execute(select(WhitelistV2).filter(WhitelistV2.id == whitelist_id))
    whitelist = result.scalars().first()
    if not whitelist:
        raise HTTPException(status_code=404, detail="Whitelist not found")

    output = io.StringIO()
    writer = csv.writer(output)
    
    base_headers = ["email", "student_id", "program", "level", "created_at"]
    
    query = select(WhitelistEntry).filter(WhitelistEntry.whitelist_id == whitelist_id).order_by(WhitelistEntry.id)
    
    batch_size = 1000
    offset = 0
    
    metadata_keys = set()
    first_batch_result = await db.execute(query.limit(batch_size).offset(0))
    first_batch = first_batch_result.scalars().all()
    
    if first_batch:
        for entry in first_batch:
            if entry.metadata_json and isinstance(entry.metadata_json, dict):
                metadata_keys.update(entry.metadata_json.keys())
    
    metadata_headers = sorted(list(metadata_keys))
    all_headers = base_headers + metadata_headers
    writer.writerow(all_headers)
    
    created_at_str = whitelist.created_at.isoformat() if whitelist.created_at else ""
    
    while True:
        res = await db.execute(query.limit(batch_size).offset(offset))
        entries = res.scalars().all()
        if not entries:
            break
        
        for entry in entries:
            row = [
                entry.email or "",
                entry.student_id or "",
                entry.program or "",
                entry.level or "",
                created_at_str
            ]
            
            meta = entry.metadata_json if entry.metadata_json and isinstance(entry.metadata_json, dict) else {}
            for key in metadata_headers:
                row.append(str(meta.get(key, "")))
                
            writer.writerow(row)
            
        offset += batch_size

    headers = {
        "Content-Disposition": f"attachment; filename=whitelist_{whitelist_id}.csv"
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

@router.get("/surveys")
async def export_surveys(db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    """Export surveys as CSV, replicating the frontend inline logic."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Community", "Student Name", "Student ID", "Survey Type", "Status", "Created At", "Data"])
    
    query = select(Survey, User, Community)\
              .join(User, Survey.user_id == User.id)\
              .join(Community, Survey.community_id == Community.id)\
              .order_by(Survey.id)
    
    batch_size = 1000
    offset = 0
    
    while True:
        result = await db.execute(query.limit(batch_size).offset(offset))
        # because we selected multiple entities (Survey, User, Community), result.all() returns tuples
        results = result.all()
        if not results:
            break
            
        for survey, user, community in results:
            created_at_str = survey.created_at.isoformat() if survey.created_at else ""
            data_str = json.dumps(survey.data) if survey.data else "{}"
            
            writer.writerow([
                community.name,
                user.name,
                user.student_id,
                survey.type,
                survey.status,
                created_at_str,
                data_str
            ])
            
        offset += batch_size

    headers = {
        "Content-Disposition": "attachment; filename=surveys_export.csv"
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)
