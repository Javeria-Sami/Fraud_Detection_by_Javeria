# Authentication Architecture & Implementation Reference

## 1. Overview
The **Real-Time Fraud & Anomaly Detection Platform** employs a stateless, cryptographically secure JWT authentication architecture paired with constant-time password verification and token rotation.

## 2. Password Security & Storage
* **Algorithm**: PBKDF2 HMAC-SHA256 with 100,000 iterations.
* **Salting**: 16-byte cryptographically secure random salt generated per user (`os.urandom(16).hex()`).
* **Format**: `salt$hash` persisted strictly in the `hashed_password` database column.
* **Verification**: Constant-time comparison using `hmac.compare_digest` to eliminate timing attack vectors.
* **Security Controls**:
  - Plaintext passwords are never logged, serialized into response models, or stored on client devices.
  - Password fields are stripped from all API response models.

## 3. JWT Token Lifecycle & Claims
* **Access Tokens**:
  - Signed using `HS256` HMAC algorithm and secret key from `JWT_SECRET_KEY`.
  - Default lifetime: 60 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`).
  - Claims: `sub` (User ID), `user_id`, `email`, `role`, `name`, `permissions` (array of assigned permission keys), `exp`, `iat`, `jti` (unique UUID), `type: "access"`.
* **Refresh Tokens**:
  - Default lifetime: 7 days (`REFRESH_TOKEN_EXPIRE_DAYS`).
  - Claims: `sub`, `user_id`, `email`, `exp`, `iat`, `jti`, `type: "refresh"`.
  - Rotation: `POST /api/v1/auth/refresh` exchanges a valid refresh token for a fresh access token without re-prompting credentials.

## 4. Anti-Brute-Force & Enumeration Defenses
* **Sliding Window Rate Limiter**: Restricts repetitive failed authentication attempts per `client_ip:email` tuple.
* **Account Enumeration Protection**: Both unknown usernames/emails and wrong passwords return an identical generic error response (`401 Unauthorized: Incorrect email or password`).
* **Account State Check**: Deactivated accounts (`is_active == False`) are immediately rejected with `403 Forbidden` and audited as `LOGIN_INACTIVE`.

## 5. Authentication Audit Events
The platform records tamper-evident audit logs in `audit_logs`:
* `LOGIN_SUCCESS`: Authenticated actor, IP address, and timestamp.
* `LOGIN_FAILED`: Failed attempt with IP address.
* `LOGIN_INACTIVE`: Blocked attempt on suspended account.
* `TOKEN_REFRESH`: Access token rotation event.
* `LOGOUT`: Clean session teardown and token retirement.
