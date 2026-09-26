"""
Centralized Structured Logging and Sensitive Data Redaction Engine.
Section 28 — Observability.

Provides:
1. JSON structured logging for production environments.
2. Sensitive credential, token, and PII redaction utilities.
3. Thread-safe and async context-aware logger with request correlation.
"""
import os
import sys
import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from contextvars import ContextVar

# Async Context Variables for Request Tracing Correlation
ctx_request_id: ContextVar[Optional[str]] = ContextVar("ctx_request_id", default=None)
ctx_trace_id: ContextVar[Optional[str]] = ContextVar("ctx_trace_id", default=None)
ctx_span_id: ContextVar[Optional[str]] = ContextVar("ctx_span_id", default=None)

# Redaction patterns for sensitive financial and authentication secrets
SENSITIVE_KEY_PATTERNS = [
    r"password",
    r"secret",
    r"token",
    r"access_token",
    r"refresh_token",
    r"jwt",
    r"authorization",
    r"api[_-]?key",
    r"cvv",
    r"cvc",
    r"pin",
    r"card_number",
    r"pan",
    r"private_key",
    r"encryption_key"
]
SENSITIVE_RE = re.compile("|".join(SENSITIVE_KEY_PATTERNS), re.IGNORECASE)

# Masking card numbers (13 to 19 digits)
CARD_PAN_RE = re.compile(r"\b(?:\d{4}[ -]?){3}\d{1,4}\b")


def redact_sensitive_data(data: Any) -> Any:
    """
    Recursively redacts sensitive keys and values from dictionary/list payloads.
    Protects passwords, tokens, API keys, and financial credentials.
    """
    if isinstance(data, dict):
        redacted = {}
        for k, v in data.items():
            if SENSITIVE_RE.search(str(k)):
                redacted[k] = "[REDACTED]"
            else:
                redacted[k] = redact_sensitive_data(v)
        return redacted
    elif isinstance(data, list):
        return [redact_sensitive_data(item) for item in data]
    elif isinstance(data, str):
        # Mask payment card PANs if present in free-text strings
        if CARD_PAN_RE.search(data):
            return CARD_PAN_RE.sub("[CARD-PAN-REDACTED]", data)
        return data
    return data


class StructuredJSONFormatter(logging.Formatter):
    """
    Serializes log records into structured JSON objects for modern log aggregation.
    Automatically enriches with request_id, trace_id, service, and environment metadata.
    """
    def __init__(self, service_name: str = "fraud-detection-platform", environment: str = "PRODUCTION"):
        super().__init__()
        self.service_name = service_name
        self.environment = environment

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": self.service_name,
            "module": record.module,
            "logger": record.name,
            "message": record.getMessage(),
            "environment": self.environment,
        }

        # Correlate with current async request/trace context
        req_id = ctx_request_id.get()
        if req_id:
            log_payload["request_id"] = req_id

        tr_id = ctx_trace_id.get()
        if tr_id:
            log_payload["trace_id"] = tr_id

        sp_id = ctx_span_id.get()
        if sp_id:
            log_payload["span_id"] = sp_id

        # Attach extra structured fields if passed via extra={}
        if hasattr(record, "structured_extra") and isinstance(record.structured_extra, dict):
            clean_extra = redact_sensitive_data(record.structured_extra)
            log_payload.update(clean_extra)

        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            log_payload["exception"] = record.exc_text

        return json.dumps(log_payload)


def setup_structured_logging(
    level: str = "INFO",
    json_format: bool = True,
    service_name: str = "fraud-detection-platform"
) -> None:
    """Configures centralized root logger with structured JSON formatting."""
    root_logger = logging.getLogger()
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)

    # Remove existing handlers to avoid duplicate log outputs
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(numeric_level)

    if json_format:
        formatter = StructuredJSONFormatter(
            service_name=service_name,
            environment=os.getenv("ENVIRONMENT", "DEVELOPMENT")
        )
    else:
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
        )

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Returns a named logger instance."""
    return logging.getLogger(name)
