import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from redis import Redis
from app.logger import logger

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Attempt to connect to Redis, gracefully degrade to memory if unavailable
try:
    redis_client = Redis.from_url(
        REDIS_URL, 
        socket_timeout=1.0, 
        socket_connect_timeout=1.0
    )
    # Ping to verify
    redis_client.ping()
    storage_uri = REDIS_URL
    logger.info("Redis connected for rate limiting")
except Exception as e:
    logger.error(f"Redis unavailable for rate limiting, degrading to memory: {e}")
    storage_uri = "memory://"

limiter = Limiter(key_func=get_remote_address, storage_uri=storage_uri)
