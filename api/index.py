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
if not os.getenv("DATABASE_URL") or (os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME")):
    import tempfile
    import shutil
    tmp_dir = tempfile.gettempdir()
    tmp_db = os.path.abspath(os.path.join(tmp_dir, "fraud_detection.db"))
    api_db = os.path.abspath(os.path.join(CURRENT_DIR, "fraud_detection.db"))
    root_db = os.path.abspath(os.path.join(ROOT_DIR, "fraud_detection.db"))
    source_db = api_db if os.path.exists(api_db) else (root_db if os.path.exists(root_db) else None)
    if not os.path.exists(tmp_db) and source_db:
        try:
            shutil.copyfile(source_db, tmp_db)
        except Exception as e:
            print(f"[api/index.py] Could not copy source_db to tmp: {e}", file=sys.stderr)
    if os.name == "nt":
        os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{tmp_db}"
        os.environ["SYNC_DATABASE_URL"] = f"sqlite:///{tmp_db}"
    else:
        clean_path = tmp_db.lstrip("/")
        os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:////{clean_path}"
        os.environ["SYNC_DATABASE_URL"] = f"sqlite:////{clean_path}"

from backend.app.main import app

# For @vercel/python runtime, export the FastAPI instance as 'app'
__all__ = ["app"]


