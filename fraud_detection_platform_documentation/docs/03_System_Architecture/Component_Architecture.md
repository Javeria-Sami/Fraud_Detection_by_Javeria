# Component Architecture

## Frontend
Dashboard shell, routing, authentication state, transaction views, alert center, case management, profiles, analytics, admin and model monitoring.

## Backend
API gateway/router, authentication, transaction service, detection service, risk service, alert service, case service, profile service, analytics service, admin service and audit service.

## ML
Feature pipeline, training pipeline, model registry, inference service, monitoring and retraining pipeline.

## Data
PostgreSQL for system-of-record data. Optional Redis/Kafka for caching and event distribution at scale.
