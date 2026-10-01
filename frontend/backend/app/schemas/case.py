"""
Pydantic Schemas for Case Management & Investigation Workspace.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CaseNoteCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)

class CaseNoteResponse(BaseModel):
    id: str
    case_id: str
    author: str
    author_id: Optional[str] = None
    content: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class CaseEvidenceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    evidence_type: str = "TRANSACTION_LOG"
    file_reference: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    metadata_json: Optional[Dict[str, Any]] = None

class CaseEvidenceResponse(BaseModel):
    id: str
    case_id: str
    title: str
    description: Optional[str] = None
    evidence_type: str
    file_reference: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    metadata_json: Optional[Dict[str, Any]] = None
    uploaded_by: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class CaseTimelineItem(BaseModel):
    id: str
    case_id: str
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    note: Optional[str] = None
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class CaseAlertItem(BaseModel):
    id: str
    alert_id: Optional[str] = None
    title: str
    severity: str
    status: str
    risk_score: float = 0.0
    alert_reason: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class CaseTransactionItem(BaseModel):
    id: str
    amount: float
    currency: str = "USD"
    merchant_name: Optional[str] = None
    payment_method: str
    risk_score: float = 0.0
    risk_level: str = "LOW"
    status: str
    timestamp: Optional[str] = None

    class Config:
        from_attributes = True

class CaseCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    user_id: Optional[str] = None
    severity: str = "MEDIUM"
    priority: str = "MEDIUM"
    assigned_analyst: Optional[str] = None
    related_transaction_ids: List[str] = []
    related_alert_ids: List[str] = []
    initial_note: Optional[str] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_analyst: Optional[str] = None

class CaseStatusUpdateRequest(BaseModel):
    status: str
    reason_note: Optional[str] = None
    expected_status: Optional[str] = None

class CaseAssignRequest(BaseModel):
    assigned_analyst: str
    note: Optional[str] = None

class CaseLinkAlertRequest(BaseModel):
    alert_id: str

class CaseLinkTransactionRequest(BaseModel):
    transaction_id: str

class CaseResolveRequest(BaseModel):
    resolution: str # Confirmed Fraud, False Positive, Legitimate Activity, Suspicious / Inconclusive, Other
    resolution_notes: str = Field(..., min_length=1)

class CaseResponse(BaseModel):
    id: str
    case_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    user_id: Optional[str] = None
    severity: str
    priority: str = "MEDIUM"
    status: str
    assigned_analyst: Optional[str] = None
    assigned_to: Optional[str] = None
    risk_score: float = 0.0
    related_transaction_ids: List[str] = []
    related_alert_ids: List[str] = []
    resolution: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    closed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    alerts_count: int = 0
    transactions_count: int = 0
    notes: List[CaseNoteResponse] = []
    evidence: List[CaseEvidenceResponse] = []

    class Config:
        from_attributes = True

class CaseDetailResponse(BaseModel):
    id: str
    case_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    user_id: Optional[str] = None
    severity: str
    priority: str = "MEDIUM"
    status: str
    assigned_analyst: Optional[str] = None
    assigned_to: Optional[str] = None
    risk_score: float = 0.0
    related_transaction_ids: List[str] = []
    related_alert_ids: List[str] = []
    resolution: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    closed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    alerts: List[CaseAlertItem] = []
    transactions: List[CaseTransactionItem] = []
    notes: List[CaseNoteResponse] = []
    evidence: List[CaseEvidenceResponse] = []
    history: List[CaseTimelineItem] = []

    class Config:
        from_attributes = True

class CasePaginatedResponse(BaseModel):
    items: List[CaseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class CaseStatsResponse(BaseModel):
    total_cases: int
    open_cases: int
    investigating_cases: int
    critical_cases: int
    unassigned_cases: int
    resolved_today: int
