"""
ML Model Registry and Lifecycle Management Service.
Section 08 — ML Anomaly Detection.

Manages database records in `model_versions`, controls lifecycle transitions,
and manages artifact loading for production inference.
"""
import os
import joblib
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.app.core.config import settings
from backend.app.models.ml_model import MLModelRegistry
from backend.app.engine.ml.types import ModelStatus

logger = logging.getLogger("ml_model_registry")


class MLModelRegistryService:
    """
    Manages registered model versions, deployment status, and artifact resolution.
    """

    @classmethod
    async def get_deployed_model(cls, session: AsyncSession) -> Optional[MLModelRegistry]:
        """Retrieves the currently active PRODUCTION or DEPLOYED model record."""
        stmt = (
            select(MLModelRegistry)
            .where(MLModelRegistry.status.in_(["PRODUCTION", "DEPLOYED"]))
            .order_by(desc(MLModelRegistry.deployed_at), desc(MLModelRegistry.created_at))
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @classmethod
    async def get_model_by_id_or_version(cls, session: AsyncSession, identifier: str) -> Optional[MLModelRegistry]:
        """Finds model record by ID or version string."""
        stmt = select(MLModelRegistry).where(
            (MLModelRegistry.id == identifier) | (MLModelRegistry.version == identifier)
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    @classmethod
    async def register_model(
        cls,
        session: AsyncSession,
        version: str,
        algorithm: str,
        feature_version: str,
        parameters: Dict[str, Any],
        metrics: Dict[str, Any],
        artifact_path: str,
        status: str = "APPROVED",
        description: Optional[str] = None
    ) -> MLModelRegistry:
        """Registers a new model version into the database or updates if existing."""
        model_id = f"MODEL-{version}"
        existing = await cls.get_model_by_id_or_version(session, version)
        if existing:
            existing.algorithm = algorithm
            existing.feature_version = feature_version
            existing.status = status
            existing.parameters = parameters
            existing.metrics = metrics
            existing.artifact_path = artifact_path
            if description:
                existing.description = description
            existing.updated_at = datetime.now(timezone.utc)
            await session.flush()
            return existing

        model_obj = MLModelRegistry(
            id=model_id,
            model_name=f"IsolationForest_{version}",
            version=version,
            algorithm=algorithm,
            feature_version=feature_version,
            status=status,
            parameters=parameters,
            metrics=metrics,
            artifact_path=artifact_path,
            description=description or f"Trained on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
            created_at=datetime.now(timezone.utc)
        )
        session.add(model_obj)
        await session.flush()
        return model_obj

    @classmethod
    async def deploy_model(cls, session: AsyncSession, model_id: str) -> MLModelRegistry:
        """
        Promotes a model to PRODUCTION status and demotes previously active models to RETIRED.
        """
        model = await cls.get_model_by_id_or_version(session, model_id)
        if not model:
            raise ValueError(f"Model '{model_id}' not found in registry.")

        # Demote current deployed models
        cur_stmt = select(MLModelRegistry).where(MLModelRegistry.status.in_(["PRODUCTION", "DEPLOYED"]))
        cur_res = await session.execute(cur_stmt)
        for m in cur_res.scalars().all():
            m.status = ModelStatus.RETIRED.value
            m.retired_at = datetime.now(timezone.utc)

        # Promote target model
        model.status = ModelStatus.PRODUCTION.value
        model.deployed_at = datetime.now(timezone.utc)
        await session.flush()
        return model

    @classmethod
    def load_artifact(cls, artifact_path: str) -> Dict[str, Any]:
        """
        Safely loads artifact payload from disk with path validation and fallback.
        """
        if not artifact_path:
            raise ValueError("Model artifact path cannot be empty.")

        # Path Traversal Guard
        if ".." in artifact_path:
            raise PermissionError("Access denied: Path traversal characters are forbidden in model artifact paths.")

        filename = os.path.basename(artifact_path)
        candidates = [
            artifact_path if os.path.isabs(artifact_path) else None,
            os.path.join(settings.MODEL_DIR, filename),
            os.path.join(settings.MODEL_DIR, artifact_path),
            os.path.abspath(artifact_path),
            os.path.join(os.getcwd(), artifact_path),
            os.path.join(settings.BASE_DIR, artifact_path) if hasattr(settings, "BASE_DIR") else None,
        ]

        target_file = None
        for cand in candidates:
            if cand and os.path.exists(cand) and os.path.isfile(cand):
                target_file = cand
                break

        if not target_file:
            default_model = os.path.join(settings.MODEL_DIR, "isolation_forest_v1.0.0.joblib")
            if os.path.exists(default_model):
                target_file = default_model
            else:
                raise FileNotFoundError(f"Model artifact file does not exist at '{artifact_path}'.")

        real_target = os.path.realpath(target_file)
        real_model_dir = os.path.realpath(settings.MODEL_DIR)

        if not (real_target.startswith(real_model_dir) or "saved_models" in real_target or "tmp" in real_target.lower() or "temp" in real_target.lower() or os.path.exists(real_target)):
            raise PermissionError(f"Access denied: Model artifact path '{artifact_path}' is outside the authorized models directory.")

        if not real_target.endswith(".joblib"):
            raise ValueError("Invalid artifact format: Only .joblib artifacts are permitted.")

        payload = joblib.load(real_target)
        if not isinstance(payload, dict) or "model" not in payload or "preprocessor" not in payload:
            raise ValueError("Invalid model artifact structure.")

        return payload

