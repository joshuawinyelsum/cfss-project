import asyncio
import io
import csv
from sqlalchemy.future import select
from app.database import engine, SessionLocal
from app.models import WhitelistEntry, WhitelistV2

async def test_export():
    try:
        async with SessionLocal() as db:
            whitelist_id = 1
            print(f"Testing export for whitelist_id: {whitelist_id}")
            result = await db.execute(select(WhitelistV2).filter(WhitelistV2.id == whitelist_id))
            whitelist = result.scalars().first()
            if not whitelist:
                print("Whitelist not found")
                return

            print(f"Found whitelist: {whitelist.id}")
            
            output = io.StringIO()
            writer = csv.writer(output)
            base_headers = ["email", "student_id", "program", "level", "created_at"]
            
            query = select(WhitelistEntry).filter(WhitelistEntry.whitelist_id == whitelist_id).order_by(WhitelistEntry.id)
            
            metadata_keys = set()
            first_batch_result = await db.execute(query.limit(10).offset(0))
            first_batch = first_batch_result.scalars().all()
            
            print(f"Found {len(first_batch)} entries in first batch")
            if first_batch:
                for entry in first_batch:
                    if entry.metadata_json and isinstance(entry.metadata_json, dict):
                        metadata_keys.update(entry.metadata_json.keys())
            
            metadata_headers = sorted(list(metadata_keys))
            all_headers = base_headers + metadata_headers
            writer.writerow(all_headers)
            print("Headers written:", all_headers)
            print("SUCCESS: Endpoint logic completed without crashing.")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_export())
