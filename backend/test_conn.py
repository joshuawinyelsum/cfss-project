import asyncio
from app.database import engine

async def test():
    try:
        async with engine.begin() as conn:
            print("Connection SUCCESS!")
    except Exception as e:
        print("Connection FAILED:", e)

if __name__ == "__main__":
    asyncio.run(test())

