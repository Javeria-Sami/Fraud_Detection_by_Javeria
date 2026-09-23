# Reusable UI Component Catalog (Section 04)

The platform provides a complete suite of accessible, typed, and composable UI primitives under `src/components/ui/`:

## 1. Action & Navigation Primitives
* **`Button`**: Supports `primary`, `secondary`, `outline`, `ghost`, `destructive` variants, `sm`, `md`, `lg` sizes, `isLoading` spinners, left/right icons, and keyboard focus states.
* **`Breadcrumbs`**: Automated route-based or explicit hierarchy crumbs with Home icon.
* **`GlobalSearchModal`**: Fast command palette (`Ctrl+K`) for workspace discovery.
* **`PageHeader`**: Unified page title, description, status badge, and action bar.

## 2. Status & Metric Indicators
* **`Badge`**: Generic semantic status pills (`default`, `success`, `warning`, `destructive`, `info`, `outline`).
* **`RiskBadge`**: Evaluates `level` or numeric `score` (0–100) and displays accessible semantic color, icon, and text label (`LOW RISK`, `MEDIUM RISK`, `HIGH RISK`, `CRITICAL`).
* **`AlertBadge`**: Displays alert severities and investigation lifecycle statuses (`NEW`, `ACKNOWLEDGED`, `INVESTIGATING`, `RESOLVED`, `CLOSED`).
* **`KPICard`**: Operational metric card with numerical value, percentage trend (+/-), direction indicators, icons, skeleton loaders, and error states.

## 3. Data & Table Foundations
* **`DataTable`**: Generic `<T>` data grid supporting sortable columns, custom cell renderers, row click handlers, pagination integration, empty states, and loading skeletons.
* **`Pagination`**: Page navigation with page jumpers, items count, and per-page size selectors.
* **`FilterBar`**: Search input, dynamic dropdown filters, active count pills, and reset action.

## 4. Overlay & Form Primitives
* **`Modal` & `Dialog`**: Accessible modal with backdrop blur, keyboard `Esc` listener, and focus trapping.
* **`Drawer`**: Sliding panel from left or right for mobile navigation and side detail inspection.
* **`ConfirmationDialog`**: Guarded modal for critical or destructive operations.
* **`Input`, `Select`, `Textarea`, `Checkbox`, `Switch`**: Form controls with error states, helper text, and accessible label linkages.

## 5. Feedback & State Primitives
* **`EmptyState`**: Structured empty view with icon, title, description, and action button.
* **`ErrorState`**: Error feedback with retry trigger.
* **`Skeleton`**: Animated placeholder blocks for cards, text, and data tables.
* **`NotificationPanel`**: Real-time security alert notifications popover.
