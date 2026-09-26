# Troubleshooting, Error Guide & FAQ

This document provides operational troubleshooting procedures for common issues, explanations of user-facing error messages, frequently asked questions, and a terminology glossary for the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. Troubleshooting Common Operational Issues

### 1.1 Cannot Log In / "Invalid Credentials"
* **Check Username & Password**: Verify that caps lock is off and credentials are typed accurately.
* **Account Status**: If your account has been suspended by an administrator, login attempts will return `Account Suspended`. Contact your system administrator.
* **Session Expired**: If you were inactive for more than 60 minutes, refresh the browser and log in again.

### 1.2 Dashboard or Pages Not Loading / Network Errors
* **API Connection**: Check if the backend API service is running (`/health` endpoint returning `200 OK`).
* **Browser Cache**: Clear browser cache and hard reload (`Ctrl + F5` or `Cmd + Shift + R`).
* **Authentication Token**: Try logging out and logging back in to refresh your JWT authorization token.

### 1.3 Live Real-Time Feed Disconnected / WebSocket Inactive
* **Indicator**: Top bar displays `Disconnected` or `Reconnecting...`.
* **Troubleshooting Steps**:
  1. Verify your network or VPN allows WebSocket connections (`ws://` / `wss://`).
  2. The application will automatically attempt reconnection every 5 seconds.
  3. If persistent, check `/admin/observability` to verify Redis and WebSocket server health.

### 1.4 A Specific Transaction or Alert is Not Appearing
* **Search / Filter Settings**: Check active filters in the Transaction Explorer or Alert Center. Clear any active date range, severity, or risk band filters.
* **Score Threshold**: Ensure the transaction met the alert generation threshold ($\text{Score} \ge 70$) if looking in the Alert Center. If it scored below 70, it will appear in the Transaction Explorer but will not produce an Alert.
* **Ingestion Delay**: Real-time evaluation takes under 50 milliseconds, but high-throughput batch ingestions may experience slight buffer queue times.

---

## 2. Common User-Facing Error Messages

| Error Message | Meaning | Recommended Action |
| :--- | :--- | :--- |
| `401 Unauthorized` | Invalid or expired session token | Log out and log back in with valid credentials. |
| `403 Forbidden` | Your user role lacks permission for this action | Contact an administrator if you require `analyst` or `admin` access. |
| `404 Not Found` | Target transaction, alert, case, or user ID does not exist | Verify the identifier or search again via Historical Search. |
| `422 Unprocessable Entity` | Form field validation error (e.g., invalid rule syntax, negative amount) | Review required form inputs and ensure correct formats. |
| `429 Too Many Requests` | API rate limit exceeded | Wait 60 seconds before retrying automated queries. |
| `500 Internal Server Error` | Unexpected backend or database exception | Note the timestamp and alert system administrators to inspect service logs. |

---

## 3. Frequently Asked Questions (FAQ)

### Q: What is the difference between an Alert and a Case?
**A**: An **Alert** is a single automated detection signal triggered by an individual high-risk transaction or anomaly event. A **Case** is a collaborative investigation file that brings together multiple alerts, transactions, forensic evidence items, analyst notes, and resolution workflows.

### Q: Does a High Risk Score mean a transaction is definitely fraud?
**A**: No. A high risk score indicates that the transaction matched strong heuristic risk patterns (e.g., velocity bursts, impossible travel, new device fingerprints) or exhibited high statistical anomaly scores. Risk scores prioritize analyst attention; confirmed fraud is determined through investigation.

### Q: What does the "Impossible Travel" signal mean?
**A**: It triggers when a single user account initiates transactions from two geographic locations separated by a distance that would be physically impossible to travel within the elapsed time between transactions (e.g., New York and Tokyo within 30 minutes).

### Q: Why are ML model performance metrics (like Precision/Recall) sometimes not shown?
**A**: Unsupervised anomaly detection models (e.g., Isolation Forest) evaluate data distributions without requiring manual labels. Supervised metrics (Precision, Recall, F1) only populate after confirmed ground-truth fraud outcomes (chargebacks/dispositions) have been linked to evaluated transactions.

### Q: Who can modify fraud detection rules?
**A**: Only authorized users with the `admin` role can create, modify, simulate, or activate detection rules in Rule Administration (`/admin/rules`).

---

## 4. Platform Terminology & Glossary

* **Anomaly Score**: A statistical value (0.0 to 1.0) produced by the machine learning engine reflecting how significantly a transaction deviates from baseline patterns.
* **Audit Log**: An immutable chronological record of all administrative, configuration, and security events.
* **Case**: A structured investigation record used to manage multi-event fraud inquiries and record dispositions.
* **Contamination Rate**: The expected proportion of outliers/anomalies in the training dataset for machine learning models.
* **Feature Vector**: The mathematical representation of a transaction (amounts, velocity counters, geolocation distance, device flags) fed into detection algorithms.
* **Heuristic Rule**: A deterministic logical condition (e.g., `amount > 5000 and is_new_device == true`) created by security administrators.
* **Population Stability Index (PSI)**: A statistical metric used to quantify the degree of feature drift between baseline training data and live production transactions.
* **Risk Band**: Categorization of risk scores into operational tiers: `LOW` (< 30), `MEDIUM` (30–69), `HIGH` (70–89), and `CRITICAL` (≥ 90).
* **Risk Score**: A composite numerical indicator (0 to 100) combining rule-based heuristics and machine learning anomaly scores.
* **Velocity**: The count or total financial volume of transactions executed by a user or device across sliding time windows (1 hour, 24 hours, 7 days).
