"""
Vercel Serverless Function entrypoint for FastAPI Backend.
Enables full-stack serverless deployment of FraudShield SOC on Vercel.
"""
import os
import sys
import traceback

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

# Configure writable /tmp SQLite database if running in Vercel serverless environment without external Postgres
if not os.getenv("DATABASE_URL") or (os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME")):
    import tempfile
    import shutil
    tmp_dir = tempfile.gettempdir()
    tmp_db = os.path.abspath(os.path.join(tmp_dir, "fraud_detection.db"))
    root_db = os.path.abspath(os.path.join(ROOT_DIR, "fraud_detection.db"))
    if not os.path.exists(tmp_db) and os.path.exists(root_db):
        try:
            shutil.copyfile(root_db, tmp_db)
        except Exception as e:
            print(f"[api/index.py] Could not copy root_db to tmp: {e}", file=sys.stderr)
    
    if os.name == "nt":
        os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{tmp_db}"
        os.environ["SYNC_DATABASE_URL"] = f"sqlite:///{tmp_db}"
    else:
        # On POSIX / Linux (Vercel runtime), 4 slashes ensure absolute path /tmp/...
        clean_path = tmp_db if tmp_db.startswith("/") else f"/{tmp_db}"
        os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{clean_path}"
        os.environ["SYNC_DATABASE_URL"] = f"sqlite:///{clean_path}"

try:
    from backend.app.main import app
except Exception as exc:
    err_tb = traceback.format_exc()
    print(f"[api/index.py FATAL ERROR] Failed to load FastAPI app: {exc}\n{err_tb}", file=sys.stderr)
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    app = FastAPI(title="Error Fallback")
    
    @app.api_route("/{path_param:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
    async def fallback_error_handler(path_param: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "ServerlessInitializationError",
                "detail": str(exc),
                "traceback": err_tb
            }
        )

try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except Exception:
    handler = app

# Export FastAPI instance 'app' and lambda 'handler' for @vercel/python
__all__ = ["app", "handler"]
