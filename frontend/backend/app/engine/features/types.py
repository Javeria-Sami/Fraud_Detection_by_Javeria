"""
Type definitions and schemas for Feature Engineering Engine.
Section 06 — Feature Engineering.
"""
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict

class FeatureDataType(str, Enum):
    NUMERIC = "numeric"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    CATEGORICAL = "categorical"
    TIMESTAMP = "timestamp"
    DURATION = "duration"

class FeatureCategory(str, Enum):
    AMOUNT = "amount"
    VELOCITY = "velocity"
    HISTORICAL = "historical"
    DEVICE = "device"
    LOCATION = "location"
    TIME = "time"
    MERCHANT = "merchant"
    FAILED_ATTEMPTS = "failed_attempts"
    PAYMENT = "payment"
    CONTEXT = "context"

class FeatureDefinition(BaseModel):
    name: str
    category: FeatureCategory
    data_type: FeatureDataType
    description: str
    calculation: str
    time_window: Optional[str] = None
    expected_range: Optional[str] = None
    default_value: Any = None
    version: str = "v1.0.0"

    model_config = ConfigDict(from_attributes=True)

class FeatureSnapshotResponse(BaseModel):
    transaction_id: str
    feature_version: str
    features: Dict[str, Any]
    created_at: str

    model_config = ConfigDict(from_attributes=True)
