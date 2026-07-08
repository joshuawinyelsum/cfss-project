import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from app.logger import trace_id_ctx_var, logger

class TraceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))
        token = trace_id_ctx_var.set(trace_id)
        
        # Optionally attach to request state
        request.state.trace_id = trace_id
        
        logger.info(f"Incoming request: {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            response.headers["X-Trace-Id"] = trace_id
            return response
        except Exception as e:
            logger.exception(f"Request failed: {request.method} {request.url.path}")
            raise
        finally:
            trace_id_ctx_var.reset(token)
