# Fraud Detection Architecture

Detection combines deterministic rules with ML anomaly signals.

Transaction → Features → Rules + ML → Signals → Risk Engine → Alert Decision.

All detection outputs should preserve reasons, rule/model versions and timestamps.
