# API Architecture

Use versioned APIs, e.g. `/api/v1`.

Standard response structure:
success: data + metadata
error: code + message + correlation_id + optional field errors

Use consistent HTTP status codes and validation.
