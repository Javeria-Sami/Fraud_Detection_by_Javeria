# Section 25 — Security Hardening Technical Architecture & Threat Model

## 1. Executive Summary & Defense-in-Depth Architecture

The **Finance & Security: Real-Time Fraud & Anomaly Detection Platform** employs a multi-layered **Defense-in-Depth** security model protecting transaction streams, financial risk engines, machine learning pipelines, administrative configurations, and user interfaces against modern cyber threats and operational abuse.

```text
       [ External Clients / Browsers / APIs ]
                         ↓
  [ TLS 1.3 Termination & HTTP Security Headers ]
   (CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff)
                         ↓
    [ Request Body Size Limiter (Max 10 MB) ]
                         ↓
    [ Multi-Tier Sliding Window Rate Limiting ]
   (Login: 15/min, API: 120/min, Admin Actions: 20/min)
                         ↓
      [ JWT Authentication & RBAC Authorization ]
   (Argon2 / PBKDF2 Constant-Time, Granular Role Scopes)
                         ↓
     [ Input Validation & Pydantic Schema Bounds ]
                         ↓
      [ Parameterized SQL Queries & Safe ORM ]
                         ↓
   [ Model Artifact & Path Traversal Boundaries ]
                         ↓
 [ Immutable Audit Logging & Masked Secret Scrubbing ]
```

---

## 2. Security Review & Vulnerability Audit Matrix

| Security Domain | Vulnerability / Threat Vector | Severity | Mitigation & Technical Implementation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | Brute-force dictionary attacks on `/auth/login` | HIGH | Sliding window rate limiter (`login_rate_limiter`, 15 attempts/min keyed by `IP:Email`) and generic invalid credential responses. | ✅ Resolved |
| **Authentication** | Weak password creation by administrators | MEDIUM | `validate_password_strength()` enforcing 8+ characters, complexity mix, and common weak password dictionary rejection. | ✅ Resolved |
| **API Security** | Wildcard CORS origins on credentialed API | HIGH | Replaced wildcard `*` with explicit trusted origins allowlist (`localhost:5173`, `localhost:3000`, `CORS_ORIGINS`). | ✅ Resolved |
| **API Security** | Missing HTTP Defense-in-Depth Headers | MEDIUM | Added global middleware injecting CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy`. | ✅ Resolved |
| **API Security** | Large payload Denial-of-Service (DoS) | HIGH | Added request body size limiter middleware rejecting payloads > 10 MB with `413 Request Entity Too Large`. | ✅ Resolved |
| **API Security** | Raw Python tracebacks & internal schema leaks | MEDIUM | Registered global exception handler catching unhandled exceptions and returning sanitized error envelopes with tracking UUIDs. | ✅ Resolved |
| **Authorization / IDOR** | Unauthorized access to user notifications/audit logs | HIGH | Strict ownership checks deriving user ID authoritatively from JWT context; unpermitted cross-user access returns `404 Not Found`. | ✅ Resolved |
| **Privilege Escalation** | Viewer/Analyst invoking admin model retraining | CRITICAL | Endpoint-level `require_roles(["admin"])` dependencies on all model train, deploy, rule mutate, and user management APIs. | ✅ Resolved |
| **ML Security** | Path traversal (`../../`) on artifact loading | HIGH | Canonical realpath normalization in `MLModelRegistryService.load_artifact()` ensuring paths strictly reside within `MODEL_DIR`. | ✅ Resolved |
| **Injection (XSS)** | Stored HTML/script injection in notes/evidence/alerts | HIGH | Automated HTML tag stripping and escaping via `sanitize_text()`. | ✅ Resolved |
| **SSRF** | Outbound webhooks targeting localhost/cloud metadata | CRITICAL | `WebhookNotificationChannel.is_safe_url()` blocking loopback (`127.0.0.1`, `::1`), private RFC1918 subnets, and AWS/GCP metadata (`169.254.169.254`). | ✅ Resolved |
| **Container Security** | Containers executing as privileged `root` | MEDIUM | Hardened `Dockerfile.backend` with dedicated non-root system user (`appuser`). | ✅ Resolved |

---

## 3. Threat Model

### Threat 1: External Credential Stuffing & Brute Force
- **Vector**: Automated botnet attempting high-velocity password guessing against `/api/v1/auth/login`.
- **Mitigation**: Combined sliding-window IP/Email rate limiter, constant-time PBKDF2 hash verification, and unified invalid credentials responses preventing account enumeration.

### Threat 2: Malicious Model Artifact Path Traversal
- **Vector**: Attacker submitting malicious `artifact_path` containing `../../` to trigger arbitrary deserialization of external files.
- **Mitigation**: Realpath resolution verifying canonical destination is prefixed by `settings.MODEL_DIR` with strict `.joblib` format checking.

### Threat 3: Server-Side Request Forgery (SSRF) via Webhooks
- **Vector**: Administrator or compromised user configuring webhook destination pointing to internal cloud metadata (`http://169.254.169.254/latest/meta-data`) or internal microservices.
- **Mitigation**: Robust URL parser verifying scheme (`http`/`https`), resolving hostname IP, and blocking private ranges, loopbacks, and link-local addresses.

---

## 4. Security Configuration Reference

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | *(Set in Environment)* | Master cryptographic signing key for JWT tokens. |
| `JWT_SECRET_KEY` | *(Set in Environment)* | Key used for HS256 JWT signature verification. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Lifespan of short-lived API access tokens. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Lifespan of signed refresh tokens. |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated list of permitted browser origins. |
| `MAX_REQUEST_BODY_BYTES` | `10485760` (10 MB) | Maximum permitted HTTP request body size. |
| `SECURE_HEADERS_ENABLED` | `true` | Enforces CSP, HSTS, X-Frame-Options, and nosniff headers. |
