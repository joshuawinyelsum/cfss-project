import asyncio
import httpx
import uuid
import datetime

async def main():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # We need a token. We can't easily register a student without a whitelist and an admin token.
        # But wait! I can just use a database script to create a user and community!
        pass
