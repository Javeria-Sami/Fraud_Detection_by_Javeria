# Frontend Architecture & Application Shell (Section 04)

## 1. Architecture Overview
The **Real-Time Fraud & Anomaly Detection Platform** frontend is constructed with React 18, TypeScript, Tailwind CSS, and Lucide icons, adopting a security-focused operational interface design.

```text
App
 ├── ThemeProvider (Dark / Light Theme Engine)
 ├── AuthProvider (JWT, RBAC, Token Refresh & Clearance)
 ├── WebSocketProvider (Live Streaming Financial Telemetry)
 └── BrowserRouter
      ├── Public Route (/login)
      └── Protected Application Shell (AppLayout)
           ├── Top Navigation (Navbar with Global Search, Notifications, Theme & User Menu)
           ├── Responsive Sidebar & Mobile Drawer
           ├── Viewport Context (Breadcrumbs & PageHeader)
           ├── Operations / Investigation / Admin Routes
           └── Real-time Transaction Simulator Dock
```

## 2. Shell Components
* **`AppLayout`**: Primary layout organizing top bar, persistent desktop sidebar, mobile navigation drawer, and scrollable content viewport.
* **`Navbar`**: Persistent header containing brand identity, live streaming connection badge, global command palette trigger (`Ctrl+K`), live alerts popover (`NotificationPanel`), theme toggle, and authenticated user dropdown.
* **`Sidebar`**: Role-aware navigation organized into *Operations & Triage* and *Administration & Governance*.
* **`MobileNavDrawer`**: Responsive slide-out drawer ensuring full functionality on mobile and tablet form factors.
