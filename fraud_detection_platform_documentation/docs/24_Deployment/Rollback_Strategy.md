# Rollback Strategy

Application rollback:
deploy previous known-good build.

Database rollback:
prefer forward-compatible migrations; use tested rollback procedures only when safe.

ML rollback:
switch inference to previous approved model version.

Document verification after rollback.
