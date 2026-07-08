from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
import pandas as pd
import io
import re
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import WhitelistV2, WhitelistEntry

router = APIRouter(prefix="/admin", tags=["admin"])

class WhitelistResponse(BaseModel):
    id: int
    name: str
    status: str
    created_at: datetime
    uploaded_by: Optional[str] = None
    
    class Config:
        from_attributes = True

class WhitelistUpdate(BaseModel):
    status: str

@router.post("/whitelist/upload")
async def upload_whitelist(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        form = await request.form()
        name = form.get("name")
        file = form.get("file")
        
        if not name or not isinstance(name, str):
            raise HTTPException(status_code=400, detail="Missing name")
        if not file or not hasattr(file, "filename"):
            raise HTTPException(status_code=400, detail="Missing file")
        if not file.filename.endswith(('.csv', '.xlsx')):
            raise HTTPException(status_code=400, detail="Invalid file format. Please upload .csv or .xlsx")
        
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        expected_cols = ["studentId", "email", "program", "level"]
        
        total = len(df)
        success = 0
        failed = 0
        errors = []

        # Transactional logic
        # 1. Archive any currently active whitelist
        await db.execute(
            update(WhitelistV2)
            .where(WhitelistV2.status == 'ACTIVE')
            .values(status='ARCHIVED')
        )
        
        # 2. Create the new ACTIVE whitelist
        new_whitelist = WhitelistV2(
            name=name,
            status='ACTIVE',
            uploaded_by="Admin"
        )
        db.add(new_whitelist)
        await db.flush() # To get the new_whitelist.id
        
        entries = []
        for index, row in df.iterrows():
            row_num = index + 2
            
            # Auto-detect column name variations
            student_id_raw = row.get('student_id') if 'student_id' in row else (row.get('studentId') if 'studentId' in row else row.get('Student ID'))
            full_name_raw  = row.get('full_name') if 'full_name' in row else (row.get('name') if 'name' in row else row.get('Name'))
            program_raw    = row.get('program') if 'program' in row else row.get('Program')
            email_raw      = row.get('email') if 'email' in row else None
            
            # Normalize
            student_id = str(student_id_raw).strip().upper() if student_id_raw and str(student_id_raw) != 'nan' else None
            full_name  = str(full_name_raw).strip() if full_name_raw and str(full_name_raw) != 'nan' else None
            program    = re.sub(r'\s+', ' ', str(program_raw).strip().lower()) if program_raw and str(program_raw) != 'nan' else None
            email      = str(email_raw).strip() if email_raw and str(email_raw) != 'nan' else None
            
            level_raw = row.get('level')
            level = None
            if pd.notna(level_raw):
                try:
                    level = int(level_raw)
                except ValueError:
                    pass
                    
            if not student_id:
                failed += 1
                errors.append({"row": row_num, "error": "Must provide student_id"})
                continue
                
            entry = WhitelistEntry(
                whitelist_id=new_whitelist.id,
                student_id=student_id,
                full_name=full_name,
                email=email,
                program=program,
                level=level
            )
            entries.append(entry)
            success += 1

        if entries:
            db.add_all(entries)
            
        whitelist_id_val = new_whitelist.id
            
        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error during save: {str(e)}")

        return {
            "total": total,
            "success": success,
            "failed": failed,
            "errors": errors,
            "whitelist_id": whitelist_id_val
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.get("/whitelist", response_model=List[WhitelistResponse])
async def get_whitelists(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WhitelistV2).where(WhitelistV2.status != 'DELETED').order_by(WhitelistV2.created_at.desc()))
    return result.scalars().all()

@router.get("/whitelist/active")
async def get_active_whitelist_entries(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    result = await db.execute(text("SELECT * FROM active_whitelist_entries"))
    rows = result.mappings().all()
    return {"entries": [dict(r) for r in rows]}

@router.get("/whitelist/{id}")
async def get_whitelist_entries(id: int, page: int = 1, limit: int = 50, db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * limit
    result = await db.execute(
        select(WhitelistEntry)
        .where(WhitelistEntry.whitelist_id == id)
        .limit(limit)
        .offset(offset)
    )
    entries = result.scalars().all()
    
    from sqlalchemy import func
    count_result = await db.execute(select(func.count(WhitelistEntry.id)).where(WhitelistEntry.whitelist_id == id))
    total = count_result.scalar()
    
    return {
        "entries": entries,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.patch("/whitelist/{id}", response_model=WhitelistResponse)
async def update_whitelist(id: int, payload: WhitelistUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WhitelistV2).where(WhitelistV2.id == id, WhitelistV2.status != 'DELETED'))
    whitelist = result.scalars().first()
    if not whitelist:
        raise HTTPException(status_code=404, detail="Whitelist not found")

    if payload.status == 'ACTIVE' and whitelist.status != 'ACTIVE':
        await db.execute(
            update(WhitelistV2)
            .where(WhitelistV2.status == 'ACTIVE')
            .values(status='ARCHIVED')
        )
    
    whitelist.status = payload.status
    await db.commit()
    await db.refresh(whitelist)
    return whitelist

@router.delete("/whitelist/{id}")
async def delete_whitelist(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WhitelistV2).where(WhitelistV2.id == id, WhitelistV2.status != 'DELETED'))
    whitelist = result.scalars().first()
    if not whitelist:
        raise HTTPException(status_code=404, detail="Whitelist not found")

    whitelist.status = 'DELETED'
    await db.commit()
    return {"message": "Whitelist deleted successfully"}
