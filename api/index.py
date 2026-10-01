"""
Vercel Serverless Function entrypoint for FastAPI Backend.
Enables full-stack serverless deployment of FraudShield SOC on Vercel.
"""
import os
import sys
import traceback

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Configure writable /tmp SQLite database if running in Vercel serverless environment without external Postgres
if (os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME")) and not os.getenv("DATABASE_URL"):
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
        clean_path = tmp_db.lstrip("/")
        os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:////{clean_path}"
        os.environ["SYNC_DATABASE_URL"] = f"sqlite:////{clean_path}"

try:
    from backend.app.main import app
except Exception as exc:
    err_tb = traceback.format_exc()
    print(f"[api/index.py FATAL ERROR] Failed to load FastAPI app: {exc}\n{err_tb}", file=sys.stderr)
    try:
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse
        app = FastAPI(title="Error Fallback")
        @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
        async def fallback_error_handler(path: str):
            return JSONResponse(
                status_code=500,
                content={
                    "error": "ServerlessInitializationError",
                    "detail": str(exc),
                    "traceback": err_tb
                }
            )
    except Exception:
        from http.server import BaseHTTPRequestHandler
        import json
        class FallbackHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "FallbackHandler", "detail": str(exc), "traceback": err_tb}).encode('utf-8'))
            def do_POST(self):
                self.do_GET()
        app = FallbackHandler

handler = app
__all__ = ["app", "handler"]
