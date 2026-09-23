# Responsive Design & Accessibility Standards (Section 04)

## 1. Multi-Device Viewport Breakpoints

The Application Shell is tested and verified across standard breakpoints:

* **Desktop (1920 × 1080 & 1440 × 900)**: Persistent sidebar, expansive grid layouts, full telemetry tables.
* **Tablet (1024 × 768)**: Condensed navigation, flexible grid columns, responsive card sizing.
* **Mobile (768 × 1024, 430 × 932, 375 × 667)**:
  - Top bar with hamburger menu toggle.
  - Off-canvas slide-out navigation drawer (`MobileNavDrawer`).
  - Horizontal scrolling for dense financial tables to prevent data clipping.
  - Touch-friendly tap targets (minimum 40px height).

## 2. Accessibility (a11y) Conformance
* **Color Blindness Defense**: Risk and severity states never rely on color alone; every badge includes text labels and contextual icons.
* **Visible Focus & Keyboard Navigation**: Form elements and interactive buttons feature high-visibility focus rings (`focus:ring-2 focus:ring-blue-500`).
* **Modal Accessibility**: Modals and Drawers manage focus, lock background scrolling, and respond to the `Escape` key.
* **ARIA Semantics**: `role="status"`, `role="dialog"`, `role="switch"`, `aria-label`, and `aria-current="page"` attributes are applied throughout.
