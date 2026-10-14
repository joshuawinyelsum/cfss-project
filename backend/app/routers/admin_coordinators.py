from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app import schemas, models, auth
from app.database import get_db
from app.logger import logger

router = APIRouter(prefix="/admin/coordinators", tags=["admin_coordinators"])

async def _build_coordinator_response(coord: models.User, db: AsyncSession) -> Dict[str, Any]:
    await db.refresh(coord)
    # Query assignments
    assign_q = await db.execute(
        select(models.CoordinatorAssignment, models.Community)
        .join(models.Community, models.CoordinatorAssignment.community_id == models.Community.id)
        .where(
            models.CoordinatorAssignment.coordinator_id == coord.id,
            models.CoordinatorAssignment.is_active == True
        )
    )
    assignments_data = []
    community_ids = []
    groups = set()
    for row in assign_q.all():
        assignment, community = row
        community_ids.append(community.id)
        if community.group_number:
            groups.add(community.group_number)
        assignments_data.append({
            "id": assignment.id,
            "community_id": community.id,
            "community_name": community.name,
            "group_number": community.group_number,
            "assigned_at": assignment.assigned_at,
            "is_active": assignment.is_active,
            "notes": assignment.notes
        })

    # Count students in assigned communities
    students_count = 0
    if community_ids:
        st_count_res = await db.execute(
            select(func.count(models.User.id)).where(
                models.User.community_id.in_(community_ids),
                models.User.role == "student"
            )
        )
        students_count = st_count_res.scalar() or 0

    # Count open issues in assigned communities
    open_issues_count = 0
    if community_ids:
        issues_res = await db.execute(
            select(func.count(models.FieldworkIssue.id)).where(
                models.FieldworkIssue.community_id.in_(community_ids),
                models.FieldworkIssue.status.in_(["OPEN", "UNDER_INVESTIGATION"])
            )
        )
        open_issues_count = issues_res.scalar() or 0

    return {
        "id": coord.id,
        "staff_id": coord.student_id,
        "name": coord.name,
        "email": coord.email,
        "phone_number": coord.phone_number,
        "faculty": coord.faculty,
        "role": coord.role,
        "is_active": coord.is_active,
        "created_at": coord.created_at,
        "assignments": assignments_data,
        "assigned_communities_count": len(community_ids),
        "assigned_groups": sorted(list(groups)),
        "assigned_students_count": students_count,
        "open_issues_count": open_issues_count
    }


@router.get("", response_model=List[schemas.CoordinatorResponse])
@router.get("/", response_model=List[schemas.CoordinatorResponse], include_in_schema=False)
async def list_coordinators(
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(auth.get_current_admin)
):
    """View all registered coordinators with assigned communities, groups, and progress summary."""
    res = await db.execute(
        select(models.User).where(models.User.role == "coordinator").order_by(models.User.name.asc())
    )
    coordinators = res.scalars().all()
    results = []
    for coord in coordinators:
        data = await _build_coordinator_response(coord, db)
        results.append(data)
    return results


@router.post("", response_model=schemas.CoordinatorResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.CoordinatorResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_coordinator(
    payload: schemas.CoordinatorCreate,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(auth.get_current_admin)
):
    """Create a new coordinator account with credentials, staff ID, and contact details."""
    clean_staff_id = payload.staff_id.strip().upper()
    
    # Check uniqueness of staff_id / student_id
    existing_id = await db.execute(select(models.User).where(models.User.student_id == clean_staff_id))
    if existing_id.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Staff / Coordinator ID '{clean_staff_id}' is already registered."
        )

    # Check email uniqueness if provided
    if payload.email:
        clean_email = payload.email.strip().lower()
        existing_email = await db.execute(select(models.User).where(func.lower(models.User.email) == clean_email))
        if existing_email.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{clean_email}' is already in use."
            )
    else:
        clean_email = None

    new_coord = models.User(
        student_id=clean_staff_id,
        name=payload.name.strip(),
        email=clean_email,
        phone_number=payload.phone_number.strip() if payload.phone_number else None,
        faculty=payload.faculty.strip() if payload.faculty else None,
        level=0,
        role="coordinator",
        password_hash=auth.get_password_hash(payload.password),
        is_verified=True,
        is_active=True
    )
    db.add(new_coord)
    await db.flush()

    audit = models.AuditLog(
        action="COORDINATOR_CREATED",
        user_id=str(admin.id),
        metadata_payload={
            "coordinator_id": new_coord.id,
            "staff_id": new_coord.student_id,
            "name": new_coord.name,
            "email": new_coord.email
        }
    )
    db.add(audit)
    await db.commit()
    await db.refresh(new_coord)

    return await _build_coordinator_response(new_coord, db)


@router.get("/{coordinator_id}", response_model=schemas.CoordinatorResponse)
async def get_coordinator(
    coordinator_id: int,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(auth.get_current_admin)
):
    """View details of a specific coordinator, including assigned communities and scoped fieldworkers."""
    coord = await db.get(models.User, coordinator_id)
    if not coord or coord.role != "coordinator":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinator not found")
    return await _build_coordinator_response(coord, db)


@router.put("/{coordinator_id}", response_model=schemas.CoordinatorResponse)
async def update_coordinator(
    coordinator_id: int,
    payload: schemas.CoordinatorUpdate,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(auth.get_current_admin)
):
    """Edit coordinator personal details and contact information."""
    coord = await db.get(models.User, coordinator_id)
    if not coord or coord.role != "coordinator":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinator not found")

    if payload.name is not None:
        coord.name = payload.name.strip()
    if payload.phone_number is not None:
        coord.phone_number = payload.phone_number.strip() if payload.phone_number else None
    if payload.faculty is not None:
        coord.faculty = payload.faculty.strip() if payload.faculty else None
    if payload.email is not None:
        clean_email = payload.email.strip().lower() if payload.email else None
        if clean_email and clean_email != (coord.email or "").lower():
            existing = await db.execute(
                select(models.User).where(func.lower(models.User.email) == clean_email, models.User.id != coord.id)
            )
            if existing.scalars().first():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use")
        coord.email = clean_email

    if payload.password:
        coord.password_hash = auth.get_password_hash(payload.password)

    audit = models.AuditLog(
        action="COORDINATOR_UPDATED",
        user_id=str(admin.id),
        metadata_payload={"coordinator_id": coord.id, "staff_id": coord.student_id}
    )
    db.add(audit)
    await db.commit()
    await db.refresh(coord)
    return await _build_coordinator_response(coord, db)


@router.patch("/{coordinator_id}/status")
async def toggle_coordinator_status(
    coordinator_id: int,
    payload: schemas.CoordinatorStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(auth.get_current_admin)
):
    """Activate or deactivate a coordinator account."""
    coord = await db.get(models.User, coordinator_id)
    if not coord or coord.role != "coordinator":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinator not found")

    coord.is_active = payload.is_active
    audit = models.AuditLog(
        action="COORDINATOR_STATUS_CHANGED",
        user_id=str(admin.id),
        metadata_payload={"coordinator_id": coord.id, "is_active": payload.is_active}
    )
    db.add(audit)
    await db.commit()
    await db.refresh(coord)
    return {"success": True, "coordinator_id": coord.id, "is_active": coord.is_active}


@router.post("/{coordinator_id}/assign", response_model=schemas.CoordinatorResponse)
async def assign_coordinator_communities(
    coordinator_id: int,
    payload: schemas.CoordinatorAssignRequest,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(auth.get_current_admin)
):
    """Assign or reassign coordinator to one or more communities. Replaces active assignment set atomically."""
    coord = await db.get(models.User, coordinator_id)
    if not coord or coord.role != "coordinator":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinator not found")

    # Validate all community_ids exist
    if payload.community_ids:
        comm_res = await db.execute(
            select(models.Community).where(models.Community.id.in_(payload.community_ids))
        )
        found_comms = {c.id for c in comm_res.scalars().all()}
        missing = set(payload.community_ids) - found_comms
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Communities not found: {list(missing)}"
            )

    # Deactivate or delete old assignments for this coordinator
    await db.execute(
        delete(models.CoordinatorAssignment).where(models.CoordinatorAssignment.coordinator_id == coord.id)
    )

    # Create new assignments
    for cid in set(payload.community_ids):
        assignment = models.CoordinatorAssignment(
            coordinator_id=coord.id,
            community_id=cid,
            assigned_by_id=admin.id,
            is_active=True,
            notes=payload.notes
        )
        db.add(assignment)

    audit = models.AuditLog(
        action="COORDINATOR_COMMUNITIES_ASSIGNED",
        user_id=str(admin.id),
        metadata_payload={
            "coordinator_id": coord.id,
            "community_ids": payload.community_ids,
            "notes": payload.notes
        }
    )
    db.add(audit)
    await db.commit()
    return await _build_coordinator_response(coord, db)


@router.post("/{coordinator_id}/assign-groups", response_model=schemas.CoordinatorResponse)
async def assign_coordinator_groups(
    coordinator_id: int,
    payload: schemas.CoordinatorAssignGroupsRequest,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(auth.get_current_admin)
):
    """Assign coordinator to all communities matching the specified group numbers."""
    coord = await db.get(models.User, coordinator_id)
    if not coord or coord.role != "coordinator":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinator not found")

    # Find all communities for these groups
    comm_res = await db.execute(
        select(models.Community).where(models.Community.group_number.in_(payload.group_numbers))
    )
    comms = comm_res.scalars().all()
    if not comms:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No communities found for groups: {payload.group_numbers}"
        )

    # Deactivate or delete old assignments for this coordinator
    await db.execute(
        delete(models.CoordinatorAssignment).where(models.CoordinatorAssignment.coordinator_id == coord.id)
    )

    # Assign all communities in those groups
    for c in comms:
        assignment = models.CoordinatorAssignment(
            coordinator_id=coord.id,
            community_id=c.id,
            assigned_by_id=admin.id,
            is_active=True,
            notes=payload.notes
        )
        db.add(assignment)

    audit = models.AuditLog(
        action="COORDINATOR_GROUPS_ASSIGNED",
        user_id=str(admin.id),
        metadata_payload={
            "coordinator_id": coord.id,
            "group_numbers": payload.group_numbers,
            "community_ids": [c.id for c in comms]
        }
    )
    db.add(audit)
    await db.commit()
    return await _build_coordinator_response(coord, db)


@router.delete("/{coordinator_id}/assignments/{community_id}")
async def remove_assignment(
    coordinator_id: int,
    community_id: int,
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(auth.get_current_admin)
):
    """Remove a specific community assignment from a coordinator."""
    await db.execute(
        delete(models.CoordinatorAssignment).where(
            models.CoordinatorAssignment.coordinator_id == coordinator_id,
            models.CoordinatorAssignment.community_id == community_id
        )
    )
    audit = models.AuditLog(
        action="COORDINATOR_ASSIGNMENT_REMOVED",
        user_id=str(admin.id),
        metadata_payload={"coordinator_id": coordinator_id, "community_id": community_id}
    )
    db.add(audit)
    await db.commit()
    return {"success": True, "coordinator_id": coordinator_id, "community_id": community_id}


@router.get("/assignments/matrix")
async def get_assignments_matrix(
    db: AsyncSession = Depends(get_db),
    admin: models.User = Depends(auth.get_current_admin)
):
    """Returns overview of all communities and their currently assigned coordinators."""
    comms_q = await db.execute(
        select(models.Community).order_by(models.Community.group_number.asc(), models.Community.name.asc())
    )
    comms = comms_q.scalars().all()

    assign_q = await db.execute(
        select(models.CoordinatorAssignment, models.User)
        .join(models.User, models.CoordinatorAssignment.coordinator_id == models.User.id)
        .where(models.CoordinatorAssignment.is_active == True)
    )
    
    comm_to_coords: Dict[int, List[Dict[str, Any]]] = {}
    for assignment, user in assign_q.all():
        if assignment.community_id not in comm_to_coords:
            comm_to_coords[assignment.community_id] = []
        comm_to_coords[assignment.community_id].append({
            "coordinator_id": user.id,
            "staff_id": user.student_id,
            "name": user.name,
            "is_active": user.is_active
        })

    matrix = []
    for c in comms:
        matrix.append({
            "community_id": c.id,
            "community_name": c.name,
            "group_number": c.group_number,
            "district": c.district,
            "region": c.region,
            "capacity": c.capacity,
            "student_count": c.current_count,
            "coordinators": comm_to_coords.get(c.id, [])
        })

    return matrix
