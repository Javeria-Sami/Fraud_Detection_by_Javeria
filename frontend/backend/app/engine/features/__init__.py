"""
Feature Engineering Engine Package.
Section 06 — Feature Engineering.
"""
from backend.app.engine.features.types import (
    FeatureDefinition,
    FeatureCategory,
    FeatureDataType,
    FeatureSnapshotResponse
)
from backend.app.engine.features.registry import (
    FEATURE_VERSION,
    FEATURE_REGISTRY,
    FEATURE_DEFINITIONS,
    get_feature_definition,
    list_features_by_category,
    get_all_feature_definitions
)
from backend.app.engine.features.service import FeatureEngineeringService
from backend.app.engine.features.validation import validate_feature_dict, generate_feature_quality_report

__all__ = [
    "FEATURE_VERSION",
    "FEATURE_REGISTRY",
    "FEATURE_DEFINITIONS",
    "FeatureDefinition",
    "FeatureCategory",
    "FeatureDataType",
    "FeatureSnapshotResponse",
    "FeatureEngineeringService",
    "get_feature_definition",
    "list_features_by_category",
    "get_all_feature_definitions",
    "validate_feature_dict",
    "generate_feature_quality_report"
]
