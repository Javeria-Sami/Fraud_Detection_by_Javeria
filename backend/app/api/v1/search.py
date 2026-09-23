"""
Historical & Cross-Entity Search API Endpoints.
Section 17 — Historical Search.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_payload
from backend.app.schemas.search import (
    SearchQueryRequest,
    SearchResponse,
    AutocompleteSuggestion,
    SearchCountsByCategory
)
from backend.app.engine.search.service import HistoricalSearchEngine
from backend.app.core.audit import AuditService

router = APIRouter(prefix="/search", tags=["Historical Search"])


@router.post("/query", response_model=SearchResponse)
async def query_historical_search(
    body: SearchQueryRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Primary multi-dimensional search endpoint across transactions, alerts, cases, users, devices, and merchants.
    """
    user_role = user_payload.get("role", "viewer")
    res = await HistoricalSearchEngine.execute_search(db, body, user_role=user_role)
    return res


@router.get("", response_model=SearchResponse)
async def get_historical_search(
    q: Optional[str] = Query(None, description="Search query string"),
    entity: Optional[str] = Query(None, description="Comma-separated entity types: transactions,alerts,cases,users,devices,merchants"),
    date_from: Optional[str] = Query(None, description="Start date ISO timestamp"),
    date_to: Optional[str] = Query(None, description="End date ISO timestamp"),
    risk_min: Optional[float] = Query(None, ge=0.0, le=100.0, description="Minimum risk score"),
    risk_max: Optional[float] = Query(None, ge=0.0, le=100.0, description="Maximum risk score"),
    risk_level: Optional[str] = Query(None, description="Risk level filter"),
    status: Optional[str] = Query(None, description="Status filter"),
    severity: Optional[str] = Query(None, description="Severity filter"),
    priority: Optional[str] = Query(None, description="Priority filter"),
    min_amount: Optional[float] = Query(None, ge=0.0, description="Minimum amount"),
    max_amount: Optional[float] = Query(None, ge=0.0, description="Maximum amount"),
    payment_method: Optional[str] = Query(None, description="Payment method"),
    currency: Optional[str] = Query(None, description="Currency"),
    country: Optional[str] = Query(None, description="Country"),
    city: Optional[str] = Query(None, description="City"),
    sort_by: Optional[str] = Query("relevance", description="Sort parameter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Page size"),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    GET-based historical search endpoint for shareable URLs and bookmarking.
    """
    entity_types = [e.strip() for e in entity.split(",")] if entity else ["transactions", "alerts", "cases", "users", "devices", "merchants"]

    req = SearchQueryRequest(
        q=q,
        entity_types=entity_types,
        date_from=date_from,
        date_to=date_to,
        risk_min=risk_min,
        risk_max=risk_max,
        risk_level=risk_level,
        status=status,
        severity=severity,
        priority=priority,
        min_amount=min_amount,
        max_amount=max_amount,
        payment_method=payment_method,
        currency=currency,
        country=country,
        city=city,
        sort_by=sort_by,
        page=page,
        page_size=page_size
    )

    user_role = user_payload.get("role", "viewer")
    res = await HistoricalSearchEngine.execute_search(db, req, user_role=user_role)
    return res


@router.get("/autocomplete", response_model=List[AutocompleteSuggestion])
async def get_search_autocomplete(
    q: str = Query(..., min_length=1, description="Search term prefix or exact query"),
    limit: int = Query(8, ge=1, le=20, description="Maximum suggestions to return"),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Fast autocomplete endpoint for exact identifier matching in the search bar dropdown.
    """
    user_role = user_payload.get("role", "viewer")
    suggestions = await HistoricalSearchEngine.get_autocomplete_suggestions(db, q, limit=limit, user_role=user_role)
    return suggestions
