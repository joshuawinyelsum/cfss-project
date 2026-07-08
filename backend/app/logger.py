import logging
import sys
from contextvars import ContextVar
import json

# Context variable to hold the trace ID
trace_id_ctx_var: ContextVar[str] = ContextVar("trace_id", default=None)

class TraceFilter(logging.Filter):
    def filter(self, record):
        trace_id = trace_id_ctx_var.get()
        if trace_id:
            record.trace_id = trace_id
        else:
            record.trace_id = "N/A"
        return True

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "time": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "trace_id": getattr(record, "trace_id", "N/A")
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def setup_logger(name="cfss"):
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Avoid duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        handler.addFilter(TraceFilter())
        logger.addHandler(handler)
        
    return logger

logger = setup_logger()
