# Business Rules

1. Every transaction must have a unique transaction identifier within its source scope.
2. Invalid transactions must not enter the fraud scoring pipeline.
3. Duplicate transactions must not create duplicate side effects.
4. Disabled rules must not trigger alerts.
5. Rule changes must be versioned and audited.
6. Risk thresholds must be configurable by authorized administrators.
7. Every alert must record its triggering signals.
8. Every case must have an auditable status and ownership history.
9. Model predictions must record model version.
10. Analyst decisions must not silently overwrite historical evidence.
11. Administrative changes require appropriate permissions and audit records.
12. Development environments must use synthetic/anonymized financial data.
