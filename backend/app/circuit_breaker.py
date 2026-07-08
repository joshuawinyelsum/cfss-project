import time
from fastapi import HTTPException
from app.logger import logger
from app.rate_limiter import redis_client

class DatabaseCircuitBreaker:
    def __init__(self, failure_threshold=5, reset_timeout=30):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.prefix = "cb:db:"

    def _get_state(self):
        try:
            if not redis_client:
                return "CLOSED"
            
            failures = int(redis_client.get(f"{self.prefix}failures") or 0)
            if failures >= self.failure_threshold:
                last_failure = float(redis_client.get(f"{self.prefix}last_failure") or 0)
                if time.time() - last_failure > self.reset_timeout:
                    return "HALF-OPEN"
                return "OPEN"
            return "CLOSED"
        except Exception:
            # If Redis is down, fail open (graceful degradation)
            return "CLOSED"

    def record_failure(self):
        try:
            if not redis_client:
                return
            redis_client.incr(f"{self.prefix}failures")
            redis_client.set(f"{self.prefix}last_failure", time.time())
            # Set TTL on the failure count so it naturally heals if no more errors
            redis_client.expire(f"{self.prefix}failures", self.reset_timeout * 2)
            logger.critical("Database Circuit Breaker recorded a failure")
        except Exception:
            pass

    def record_success(self):
        try:
            if not redis_client:
                return
            state = self._get_state()
            if state == "HALF-OPEN" or state == "CLOSED":
                redis_client.delete(f"{self.prefix}failures")
                redis_client.delete(f"{self.prefix}last_failure")
        except Exception:
            pass

    async def check(self):
        state = self._get_state()
        if state == "OPEN":
            logger.critical("Database Circuit Breaker is OPEN. Rejecting request.")
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable due to high load.",
                headers={"Retry-After": str(self.reset_timeout)}
            )

db_circuit_breaker = DatabaseCircuitBreaker()
