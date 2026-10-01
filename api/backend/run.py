"""
Production Backend Application Runner.
Section 30 — Deployment.

Dynamically configures Uvicorn process manager:
- Development: Single process with live code reloading (reload=True).
- Production / Staging: Multi-worker concurrency (workers >= 2), reload=False,
  proxy headers enabled for reverse proxy (Nginx / Cloud Load Balancer) forwarding.
"""
import os
import sys
import multiprocessing
import uvicorn

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    env = os.getenv("ENVIRONMENT", "DEVELOPMENT").upper()
    is_dev = env == "DEVELOPMENT"

    # Determine worker count based on CPU cores or environment variable
    default_workers = max(2, multiprocessing.cpu_count()) if not is_dev else 1
    workers = int(os.getenv("WEB_CONCURRENCY", str(default_workers)))
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print(f"[{env}] Starting Fraud & Anomaly Detection Platform on {host}:{port} (Workers: {workers if not is_dev else 1}, Reload: {is_dev})")

    if is_dev:
        uvicorn.run(
            "backend.app.main:app",
            host=host,
            port=port,
            reload=True,
            log_level="info"
        )
    else:
        uvicorn.run(
            "backend.app.main:app",
            host=host,
            port=port,
            workers=workers,
            reload=False,
            proxy_headers=True,
            forwarded_allow_ips="*",
            timeout_keep_alive=30,
            log_level=os.getenv("LOG_LEVEL", "info").lower()
        )
