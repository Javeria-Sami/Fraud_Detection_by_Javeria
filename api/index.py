"""
Vercel Serverless Function entrypoint for FastAPI Backend.
Enables full-stack serverless deployment of FraudShield SOC on Vercel.
"""
import os
import sys
import shutil

# Ensure the repository root is in python module search path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Configure writable /tmp SQLite database if running in Vercel serverless environment without external Postgres
if (os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME")) and not os.getenv("DATABASE_URL"):
    tmp_db = "/tmp/fraud_detection.db"
    root_db = os.path.join(ROOT_DIR, "fraud_detection.db")
    if not os.path.exists(tmp_db) and os.path.exists(root_db):
        try:
            shutil.copyfile(root_db, tmp_db)
        except Exception:
            pass
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{tmp_db}"
    os.environ["SYNC_DATABASE_URL"] = f"sqlite:///{tmp_db}"

from backend.app.main import app

# Vercel looks for the ASGI application object 'app'
__all__ = ["app"]
