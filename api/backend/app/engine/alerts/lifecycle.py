"""
Alert Lifecycle State Machine and Transition Validator.
Section 10 — Alert Engine.
"""
from typing import Dict, Set, Tuple
from backend.app.engine.alerts.types import AlertStatus


class InvalidAlertStateTransitionError(ValueError):
    """Raised when an illegal or unsupported alert lifecycle status transition is attempted."""
    pass


class AlertLifecycleManager:
    """
    Guarantees deterministic and auditable state transitions for operational fraud alerts.
    """

    # Valid Directed State Transition Graph
    _VALID_TRANSITIONS: Dict[str, Set[str]] = {
        "NEW": {"ACKNOWLEDGED", "INVESTIGATING", "IN_PROGRESS", "RESOLVED", "CLOSED", "DISMISSED", "ESCALATED"},
        "OPEN": {"ACKNOWLEDGED", "INVESTIGATING", "IN_PROGRESS", "RESOLVED", "CLOSED", "DISMISSED", "ESCALATED"},
        "ACKNOWLEDGED": {"INVESTIGATING", "IN_PROGRESS", "RESOLVED", "CLOSED", "DISMISSED", "ESCALATED"},
        "INVESTIGATING": {"RESOLVED", "CLOSED", "DISMISSED", "ESCALATED"},
        "IN_PROGRESS": {"RESOLVED", "CLOSED", "DISMISSED", "ESCALATED"},
        "ESCALATED": {"INVESTIGATING", "IN_PROGRESS", "RESOLVED", "CLOSED", "DISMISSED"},
        "RESOLVED": {"CLOSED", "DISMISSED"},
        "CLOSED": set(), # Terminal state
        "DISMISSED": set() # Terminal state
    }

    @classmethod
    def can_transition(cls, current_status: str, target_status: str) -> bool:
        curr = current_status.upper().strip()
        tgt = target_status.upper().strip()
        
        # Self transition is allowed (no-op)
        if curr == tgt:
            return True
            
        allowed_targets = cls._VALID_TRANSITIONS.get(curr, set())
        return tgt in allowed_targets

    @classmethod
    def validate_transition(cls, current_status: str, target_status: str) -> str:
        curr = current_status.upper().strip()
        tgt = target_status.upper().strip()

        if not cls.can_transition(curr, tgt):
            raise InvalidAlertStateTransitionError(
                f"Invalid alert state transition from '{curr}' to '{tgt}'. "
                f"Permitted destination states: {list(cls._VALID_TRANSITIONS.get(curr, []))}"
            )
        return tgt
