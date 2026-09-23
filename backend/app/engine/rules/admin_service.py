"""
Fraud Rule Administration Service.
Section 19 — Configurable Alerts & Rule Administration.

Handles versioned rule management, schema-based configuration validation,
atomic activation/retirement, version comparisons, and dry-run rule simulations.
"""
import uuid
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case
from sqlalchemy.orm import selectinload

from backend.app.models.rule import FraudRule, FraudRuleVersion, RuleExecution
from backend.app.schemas.rule import (
    FraudRuleResponse,
    FraudRuleVersionResponse,
    RuleConfigValidationResponse,
    RuleVersionCompareResponse,
    ConfigFieldDiff,
    RuleSimulationRequest,
    RuleSimulationResponse,
    RuleExecutionResponse,
    RuleExecutionListResponse,
)
from backend.app.engine.rules.registry import RuleRegistry
from backend.app.engine.rules.validator import RuleConfigValidator, RuleConfigValidationError
from backend.app.engine.rules.types import RuleSeverity, RuleEvaluationResult
from backend.app.engine.features import FeatureEngineeringService
from backend.app.core.audit import AuditService


class RuleAdminService:
    """Central service for fraud rule administration, versioning, and simulation."""

    @classmethod
    async def list_rules(
        cls,
        db: AsyncSession,
        search: Optional[str] = None,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[FraudRuleResponse]:
        """Lists fraud rules with search/filter and execution statistics."""
        stmt = select(FraudRule).options(selectinload(FraudRule.versions)).order_by(FraudRule.priority.asc(), FraudRule.id.asc())

        if category:
            stmt = stmt.where(FraudRule.category == category.upper())
        if severity:
            stmt = stmt.where(
                (FraudRule.severity == severity.upper()) | (FraudRule.default_severity == severity.upper())
            )
        if is_active is not None:
            stmt = stmt.where(FraudRule.is_active == is_active)

        res = await db.execute(stmt)
        rules = res.scalars().all()

        # Query execution metrics per rule
        exec_stmt = (
            select(
                RuleExecution.rule_id,
                func.count(RuleExecution.id).label("total_execs"),
                func.sum(case((RuleExecution.triggered == True, 1), else_=0)).label("total_triggers")
            )
            .group_by(RuleExecution.rule_id)
        )
        exec_res = await db.execute(exec_stmt)
        exec_map = {row.rule_id: (row.total_execs, row.total_triggers or 0) for row in exec_res}

        results: List[FraudRuleResponse] = []
        for r in rules:
            # Filter by search string if provided
            if search:
                s = search.lower()
                r_code = (r.rule_code or r.id).lower()
                r_name = (r.name or "").lower()
                r_desc = (r.description or "").lower()
                if s not in r_code and s not in r_name and s not in r_desc:
                    continue

            # Map versions
            vers = [
                FraudRuleVersionResponse(
                    id=v.id,
                    rule_id=v.rule_id,
                    version=v.version,
                    configuration=v.configuration or {},
                    threshold=v.threshold,
                    weight=v.weight,
                    is_active=v.is_active,
                    created_by=v.created_by,
                    created_at=v.created_at.isoformat() if v.created_at else None,
                )
                for v in (r.versions or [])
            ]
            vers.sort(key=lambda v: str(v.version), reverse=True)

            active_ver = next((v for v in (r.versions or []) if v.is_active), None)
            total_e, total_t = exec_map.get(r.id, (0, 0))
            t_rate = round(float(total_t) / float(total_e), 4) if total_e > 0 else 0.0

            results.append(
                FraudRuleResponse(
                    id=r.id,
                    rule_code=r.rule_code or r.id,
                    name=r.name,
                    description=r.description,
                    category=r.category,
                    weight=r.weight,
                    severity=r.severity or r.default_severity or "MEDIUM",
                    priority=r.priority,
                    is_active=r.is_active,
                    condition_config=r.condition_config or {},
                    version=active_ver.version if active_ver else (r.version or "1.0"),
                    active_version_id=active_ver.id if active_ver else None,
                    total_executions=total_e,
                    total_triggers=total_t,
                    trigger_rate=t_rate,
                    created_by=r.created_by,
                    updated_by=r.updated_by,
                    created_at=r.created_at.isoformat() if r.created_at else None,
                    updated_at=r.updated_at.isoformat() if r.updated_at else None,
                    versions=vers,
                )
            )

        return results

    @classmethod
    async def get_rule_detail(cls, db: AsyncSession, rule_id: str) -> Optional[FraudRuleResponse]:
        """Retrieves complete details, active version, and version timeline for a single rule."""
        stmt = (
            select(FraudRule)
            .where((FraudRule.id == rule_id) | (FraudRule.rule_code == rule_id))
            .options(selectinload(FraudRule.versions))
        )
        res = await db.execute(stmt)
        rule = res.scalar_one_or_none()
        if not rule:
            return None

        # Query metrics
        exec_stmt = (
            select(
                func.count(RuleExecution.id).label("total_execs"),
                func.sum(case((RuleExecution.triggered == True, 1), else_=0)).label("total_triggers")
            )
            .where(RuleExecution.rule_id == rule.id)
        )
        exec_res = await db.execute(exec_stmt)
        row = exec_res.first()
        total_e = row.total_execs if row else 0
        total_t = (row.total_triggers or 0) if row else 0
        t_rate = round(float(total_t) / float(total_e), 4) if total_e > 0 else 0.0

        vers = [
            FraudRuleVersionResponse(
                id=v.id,
                rule_id=v.rule_id,
                version=v.version,
                configuration=v.configuration or {},
                threshold=v.threshold,
                weight=v.weight,
                is_active=v.is_active,
                created_by=v.created_by,
                created_at=v.created_at.isoformat() if v.created_at else None,
            )
            for v in (rule.versions or [])
        ]
        vers.sort(key=lambda v: str(v.version), reverse=True)
        active_ver = next((v for v in (rule.versions or []) if v.is_active), None)

        return FraudRuleResponse(
            id=rule.id,
            rule_code=rule.rule_code or rule.id,
            name=rule.name,
            description=rule.description,
            category=rule.category,
            weight=rule.weight,
            severity=rule.severity or rule.default_severity or "MEDIUM",
            priority=rule.priority,
            is_active=rule.is_active,
            condition_config=active_ver.configuration if active_ver else (rule.condition_config or {}),
            version=active_ver.version if active_ver else (rule.version or "1.0"),
            active_version_id=active_ver.id if active_ver else None,
            total_executions=total_e,
            total_triggers=total_t,
            trigger_rate=t_rate,
            created_by=rule.created_by,
            updated_by=rule.updated_by,
            created_at=rule.created_at.isoformat() if rule.created_at else None,
            updated_at=rule.updated_at.isoformat() if rule.updated_at else None,
            versions=vers,
        )

    @classmethod
    async def create_rule_version(
        cls,
        db: AsyncSession,
        rule_id: str,
        version_str: str,
        configuration: Dict[str, Any],
        weight: float,
        threshold: Optional[float],
        is_active: bool,
        actor_email: str,
        reason: Optional[str] = None,
    ) -> FraudRuleVersionResponse:
        """Creates a new immutable FraudRuleVersion with validated configuration."""
        stmt = (
            select(FraudRule)
            .where((FraudRule.id == rule_id) | (FraudRule.rule_code == rule_id))
            .options(selectinload(FraudRule.versions))
        )
        res = await db.execute(stmt)
        rule = res.scalar_one_or_none()
        if not rule:
            raise ValueError(f"Fraud rule '{rule_id}' not found.")

        # Validate configuration
        rule_code = rule.rule_code or rule.id
        validated_cfg = RuleRegistry.validate_configuration(rule_code, configuration)

        # If new version is marked active, atomically retire previous active versions
        if is_active:
            for pv in (rule.versions or []):
                if pv.is_active:
                    pv.is_active = False

        new_version = FraudRuleVersion(
            id=str(uuid.uuid4()),
            rule_id=rule.id,
            version=version_str,
            configuration=validated_cfg,
            threshold=threshold,
            weight=weight,
            is_active=is_active,
            created_by=actor_email,
        )
        db.add(new_version)

        if is_active:
            rule.version = version_str
            rule.weight = weight
            rule.condition_config = validated_cfg
            rule.updated_by = actor_email

        await db.flush()

        # Audit logging
        await AuditService.log_action(
            db,
            actor_email=actor_email,
            actor_role="admin",
            action="RULE_VERSION_CREATE",
            target_entity="FraudRuleVersion",
            target_id=new_version.id,
            details=f"Created version {version_str} for rule {rule.id}" + (f" (Reason: {reason})" if reason else ""),
            diff_new={"version": version_str, "weight": weight, "is_active": is_active, "config": validated_cfg}
        )

        await db.commit()
        await db.refresh(new_version)

        return FraudRuleVersionResponse(
            id=new_version.id,
            rule_id=new_version.rule_id,
            version=new_version.version,
            configuration=new_version.configuration or {},
            threshold=new_version.threshold,
            weight=new_version.weight,
            is_active=new_version.is_active,
            created_by=new_version.created_by,
            created_at=new_version.created_at.isoformat() if new_version.created_at else None,
        )

    @classmethod
    async def activate_version(
        cls,
        db: AsyncSession,
        rule_id: str,
        version_id: str,
        actor_email: str,
        reason: Optional[str] = None,
    ) -> FraudRuleResponse:
        """Atomically activates a specified rule version and deactivates all others."""
        stmt = (
            select(FraudRule)
            .where((FraudRule.id == rule_id) | (FraudRule.rule_code == rule_id))
            .options(selectinload(FraudRule.versions))
        )
        res = await db.execute(stmt)
        rule = res.scalar_one_or_none()
        if not rule:
            raise ValueError(f"Fraud rule '{rule_id}' not found.")

        target_version: Optional[FraudRuleVersion] = None
        for v in (rule.versions or []):
            if v.id == version_id or v.version == version_id:
                target_version = v
                break

        if not target_version:
            raise ValueError(f"Version '{version_id}' not found for rule '{rule_id}'.")

        # Deactivate all versions and activate target
        for v in (rule.versions or []):
            v.is_active = (v.id == target_version.id)

        rule.version = target_version.version
        rule.weight = target_version.weight
        rule.condition_config = target_version.configuration or {}
        rule.is_active = True
        rule.updated_by = actor_email

        await db.flush()

        await AuditService.log_action(
            db,
            actor_email=actor_email,
            actor_role="admin",
            action="RULE_VERSION_ACTIVATE",
            target_entity="FraudRule",
            target_id=rule.id,
            details=f"Activated version {target_version.version} for rule {rule.id}" + (f" (Reason: {reason})" if reason else ""),
            diff_new={"active_version": target_version.version, "version_id": target_version.id}
        )

        await db.commit()
        return await cls.get_rule_detail(db, rule.id)

    @classmethod
    async def retire_version(
        cls,
        db: AsyncSession,
        rule_id: str,
        version_id: str,
        actor_email: str,
        reason: Optional[str] = None,
    ) -> FraudRuleResponse:
        """Retires/deactivates a specific rule version without deleting its history."""
        stmt = (
            select(FraudRule)
            .where((FraudRule.id == rule_id) | (FraudRule.rule_code == rule_id))
            .options(selectinload(FraudRule.versions))
        )
        res = await db.execute(stmt)
        rule = res.scalar_one_or_none()
        if not rule:
            raise ValueError(f"Fraud rule '{rule_id}' not found.")

        target_version: Optional[FraudRuleVersion] = None
        for v in (rule.versions or []):
            if v.id == version_id or v.version == version_id:
                target_version = v
                break

        if not target_version:
            raise ValueError(f"Version '{version_id}' not found for rule '{rule_id}'.")

        target_version.is_active = False
        rule.updated_by = actor_email

        await db.flush()

        await AuditService.log_action(
            db,
            actor_email=actor_email,
            actor_role="admin",
            action="RULE_VERSION_RETIRE",
            target_entity="FraudRuleVersion",
            target_id=target_version.id,
            details=f"Retired version {target_version.version} for rule {rule.id}" + (f" (Reason: {reason})" if reason else "")
        )

        await db.commit()
        return await cls.get_rule_detail(db, rule.id)

    @classmethod
    async def compare_versions(
        cls,
        db: AsyncSession,
        version_id_a: str,
        version_id_b: str,
    ) -> RuleVersionCompareResponse:
        """Computes structural field-by-field diff between two rule versions."""
        stmt_a = select(FraudRuleVersion).where(FraudRuleVersion.id == version_id_a).options(selectinload(FraudRuleVersion.rule))
        stmt_b = select(FraudRuleVersion).where(FraudRuleVersion.id == version_id_b).options(selectinload(FraudRuleVersion.rule))

        res_a = await db.execute(stmt_a)
        res_b = await db.execute(stmt_b)

        v_a = res_a.scalar_one_or_none()
        v_b = res_b.scalar_one_or_none()

        if not v_a or not v_b:
            raise ValueError("One or both specified rule versions were not found.")

        cfg_a = v_a.configuration or {}
        cfg_b = v_b.configuration or {}

        all_keys = sorted(set(list(cfg_a.keys()) + list(cfg_b.keys())))
        diff_list: List[ConfigFieldDiff] = []

        for k in all_keys:
            val_a = cfg_a.get(k)
            val_b = cfg_b.get(k)
            diff_list.append(
                ConfigFieldDiff(
                    field=k,
                    value_a=val_a,
                    value_b=val_b,
                    changed=(val_a != val_b)
                )
            )

        return RuleVersionCompareResponse(
            rule_id=v_a.rule_id,
            rule_code=v_a.rule.rule_code if v_a.rule else v_a.rule_id,
            version_a=v_a.version,
            version_b=v_b.version,
            weight_a=v_a.weight,
            weight_b=v_b.weight,
            is_active_a=v_a.is_active,
            is_active_b=v_b.is_active,
            created_at_a=v_a.created_at.isoformat() if v_a.created_at else None,
            created_at_b=v_b.created_at.isoformat() if v_b.created_at else None,
            configuration_diff=diff_list,
        )

    @classmethod
    async def simulate_rule(
        cls,
        db: AsyncSession,
        req: RuleSimulationRequest,
    ) -> RuleSimulationResponse:
        """
        Executes a zero-side-effect simulation of a rule configuration against synthetic data.
        Does NOT write to RuleExecution, does NOT mutate Transaction risk scores, and does NOT generate Alerts.
        """
        start_time = time.perf_counter()
        rule_code = req.rule_code.upper()
        evaluator = RuleRegistry.get(rule_code)
        if not evaluator:
            raise ValueError(f"No registered rule evaluator found for code '{rule_code}'.")

        # 1. Validate configuration
        cfg = req.configuration or {}
        validated_cfg = RuleRegistry.validate_configuration(rule_code, cfg) if cfg else {}

        # 2. Extract or synthesize features from transaction
        txn_data = req.transaction_data or {}
        features = await FeatureEngineeringService.extract_features(db, txn_data)
        if req.feature_overrides:
            features.update(req.feature_overrides)

        # 3. Evaluate in memory
        weight = req.weight if req.weight is not None else (evaluator.default_weight)
        eval_result = evaluator.run(
            transaction=txn_data,
            features=features,
            configuration=validated_cfg,
            weight_override=weight,
            version="SIM-1.0",
        )

        exec_ms = round((time.perf_counter() - start_time) * 1000, 3)
        final_score = eval_result.score
        severity = req.severity or eval_result.severity.value

        return RuleSimulationResponse(
            rule_code=rule_code,
            triggered=eval_result.triggered,
            score=final_score,
            severity=severity,
            explanation=eval_result.reason or ("Condition triggered based on evaluated features." if eval_result.triggered else "Condition not met."),
            matched_features=eval_result.matched_features or {},
            configured_thresholds=validated_cfg,
            execution_time_ms=exec_ms,
            simulated_at=datetime.now(timezone.utc).isoformat(),
            is_simulation=True,
        )

    @classmethod
    async def list_rule_executions(
        cls,
        db: AsyncSession,
        rule_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> RuleExecutionListResponse:
        """Retrieves paginated historical rule executions for auditing."""
        count_stmt = select(func.count(RuleExecution.id)).where(RuleExecution.rule_id == rule_id)
        total = (await db.execute(count_stmt)).scalar() or 0

        stmt = (
            select(RuleExecution)
            .where(RuleExecution.rule_id == rule_id)
            .order_by(RuleExecution.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        res = await db.execute(stmt)
        execs = res.scalars().all()

        items = [
            RuleExecutionResponse(
                id=e.id,
                transaction_id=e.transaction_id,
                rule_id=e.rule_id,
                rule_version_id=e.rule_version_id,
                triggered=e.triggered,
                score=e.score,
                reason=e.reason,
                execution_time_ms=e.execution_time_ms,
                points_awarded=e.points_awarded,
                execution_detail=e.execution_detail or {},
                created_at=e.created_at.isoformat() if e.created_at else None,
            )
            for e in execs
        ]

        return RuleExecutionListResponse(total=total, rule_id=rule_id, items=items)
