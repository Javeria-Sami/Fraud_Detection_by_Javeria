# UI Design System & Semantic Tokens (Section 04)

## 1. Design Philosophy
The platform visual language is tailored for high-density financial security and SOC environments:
* **Minimalist & High-Density**: Maximum data clarity without visual clutter.
* **Semantic Risk Tokens**: Universal risk colors combined with explicit text labels and ARIA attributes for accessibility.
* **Dual Theme Engine**: Native Dark (default high-contrast SOC) and Light mode support powered by CSS variables and Tailwind.

## 2. Design Tokens Matrix

| Semantic Token | Light Mode Value | Dark Mode Value | Usage Context |
| :--- | :--- | :--- | :--- |
| `--soc-bg` | `#F8FAFC` | `#0B0F19` | Application canvas background |
| `--soc-surface` | `#FFFFFF` | `#0E1422` | Form fields, tables, controls |
| `--soc-card` | `#FFFFFF` | `#111827` | Dashboard panels, cards, modals |
| `--soc-border` | `#E2E8F0` | `#1E293B` | Dividers, card borders, table rows |
| `--soc-accent` | `#2563EB` | `#3B82F6` | Primary actions, active navigation |
| `--soc-muted` | `#64748B` | `#94A3B8` | Captions, helper text, timestamps |
| `Risk LOW` | `#10B981` | `#10B981` | Safe transactions (Score < 30) |
| `Risk MEDIUM` | `#EAB308` | `#EAB308` | Elevated review (Score 30–69) |
| `Risk HIGH` | `#F97316` | `#F97316` | High risk anomalies (Score 70–89) |
| `Risk CRITICAL` | `#EF4444` | `#EF4444` | Confirmed fraud / blocked (Score >= 90) |

## 3. Typography Hierarchy
* **UI & Body**: `Inter`, system-ui, sans-serif
* **Telemetry, Scores & Code**: `JetBrains Mono`, monospace (used for transaction IDs, metrics, latency, and status badges).
