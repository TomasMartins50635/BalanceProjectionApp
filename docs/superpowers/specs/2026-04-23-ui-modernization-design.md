# UI Modernization — Design Spec
**Date:** 2026-04-23  
**Status:** Approved  
**Stack:** React + Vite + Tailwind CSS v4 + shadcn/ui + Lucide icons

---

## 1. Goal

Upgrade the web UI of BalanceProjectionApp to look modern, professional, and user-friendly without changing any backend behaviour. All changes are purely frontend — no API contract changes, no data model changes.

---

## 2. Design System

### 2.1 Color Palette

| Token | Value | Usage |
|---|---|---|
| `primary` | `#4f46e5` (indigo-600) | CTAs, nav active indicator, links, focus rings |
| `primary-muted` | `#eef2ff` (indigo-50) | Icon badge backgrounds, pill backgrounds |
| `sidebar-bg` | `#0f172a` (slate-900) | Sidebar background |
| `sidebar-section` | `#1e293b` (slate-800) | Nav item active background |
| `sidebar-border` | `#1e293b` (slate-800) | Sidebar internal dividers |
| `page-bg` | `#f8fafc` (slate-50) | Main content area background |
| `surface` | `#ffffff` | Cards, dialogs, table backgrounds |
| `border` | `#e2e8f0` (slate-200) | Card borders, table borders |
| `text-primary` | `#0f172a` (slate-900) | Headings, important data |
| `text-secondary` | `#475569` (slate-600) | Body text, table cells |
| `text-muted` | `#94a3b8` (slate-400) | Labels, captions, placeholders |
| `success` | `#16a34a` (green-600) | Revenue, positive values, paid badges |
| `success-muted` | `#f0fdf4` (green-50) | Revenue badge backgrounds |
| `danger` | `#dc2626` (red-600) | Expenses, negative values, overdue |
| `danger-muted` | `#fef2f2` (red-50) | Expense badge backgrounds |
| `warning` | `#f59e0b` (amber-500) | Pending items, due-soon indicators |
| `warning-muted` | `#fffbeb` (amber-50) | Pending badge backgrounds |

### 2.2 Typography

Font: **Inter** (already available via system/Tailwind). No additional font loading needed.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Display / Hero number | 28–32px | 700 | `font-variant-numeric: tabular-nums` always |
| Page title | 22px | 600 | |
| Section heading | 16px | 500 | |
| Card label | 11px | 600 | UPPERCASE, `letter-spacing: 0.05em` |
| Body / Table cell | 14px | 400 | Line-height 1.5 |
| Caption / Helper | 12px | 400 | `text-muted` color |
| Monetary values | any | any | Always `font-variant-numeric: tabular-nums` |

### 2.3 Spacing System

4/8px base grid — use only multiples: `4, 8, 12, 16, 20, 24, 32, 40, 48px`.  
Tailwind equivalents: `p-1, p-2, p-3, p-4, p-5, p-6, p-8, p-10, p-12`.

### 2.4 Border Radius Scale

| Element | Radius |
|---|---|
| Cards | `rounded-xl` (12px) |
| Buttons | `rounded-lg` (8px) |
| Badges / Pills | `rounded-full` |
| Icon badges | `rounded-lg` (8px) |
| Inputs | `rounded-lg` (8px) |
| Dialog / Modal | `rounded-2xl` (16px) |

### 2.5 Shadow Scale

| Usage | Value |
|---|---|
| Cards (default) | `shadow-sm` — `0 1px 3px rgba(0,0,0,0.06)` |
| Cards (hover) | `shadow-md` — `0 4px 12px rgba(0,0,0,0.08)` |
| Dialogs | `shadow-xl` |
| Sidebar | none (flat) |

---

## 3. Component Designs

### 3.1 Sidebar Navigation

**Structure:**
- Logo mark (indigo square icon) + "Gestão Financeira" wordmark — 48px tall header
- Section label: `PRINCIPAL` — 9px uppercase slate-500
- Nav items: 36px tall, `px-3 py-2`, icon (16px) + label (13px)
- Active state: `bg-slate-800` background + `border-l-2 border-indigo-500` left indicator + white text
- Inactive state: `text-slate-400 hover:bg-slate-800/60 hover:text-slate-200`
- Divider before Simulation mode button
- Simulation button: amber accent when active

**Mobile:** Horizontal scrolling nav bar at the top (existing behaviour preserved). Improve with: active indicator as bottom border, better spacing.

### 3.2 KPI Cards (OverviewView)

Each card:
- Icon badge: 32×32px, `rounded-lg`, `bg-primary-muted` with colored icon
- UPPERCASE label (11px, slate-500)
- Large number (28px, 700, tabular-nums)
- Trend line: colored indicator + "vs mês anterior" caption

### 3.3 Account Cards (Dashboard)

- 12px radius, `shadow-sm`, border `border-slate-200`
- Initial letter badge: coloured per account (violet/blue/emerald/amber)
- Selected state: `ring-2 ring-indigo-200 border-indigo-300`
- Balance: tabular-nums, coloured per account style
- Progress bar: `h-1.5`, `rounded-full`, coloured per account

### 3.4 Data Tables

- Header: `bg-slate-50`, sticky top, `text-xs font-semibold text-slate-500 uppercase tracking-wide`
- Row hover: `bg-slate-50/70`
- Expanded row: `bg-indigo-50/40`
- Type badges: pill style with coloured background (green for receita, red for despesa)
- Status badges: `Liquidada` → green-100/green-700, `Pendente` → slate-100/slate-600
- Monetary cells: always tabular-nums, green for revenue (+), red for expense (-)

### 3.5 Buttons

- Primary: `bg-indigo-600 hover:bg-indigo-700 text-white` — min height 36px
- Outline: `border-slate-200 hover:border-slate-300 hover:bg-slate-50`
- Ghost: `hover:bg-slate-100`
- Destructive: `text-red-600 hover:bg-red-50`
- Loading state: disabled + spinner — always apply during async ops

### 3.6 Dialogs / Forms

- Max-width: `sm:max-w-md` (simple), `sm:max-w-2xl` (complex)
- Label style: 11px uppercase, `font-medium text-slate-500 tracking-wide`
- Input: `rounded-lg border-slate-200 focus:border-indigo-400 focus:ring-indigo-200`
- Section separators inside dialogs: subtle `border-t border-slate-100`

---

## 4. View-by-View Changes

### 4.1 App.tsx (Sidebar)

- Add logo mark icon (indigo square with inner white square, using `div` or SVG)
- Add section group label ("PRINCIPAL")
- Replace plain active `bg-blue-600` with `bg-slate-800 + border-l-2 border-indigo-500`
- Increase nav item height from 32px to 36px for better touch targets
- Keep simulation mode button with amber accent unchanged in logic, update styling

### 4.2 OverviewView

- KPI cards: add icon badges, uppercase labels, tabular-nums, trend indicators
- Line chart: update stroke colors to match palette, use `stroke="#4f46e5"` for neutral/primary, keep green/red for receitas/despesas
- Chart grid lines: lighter (`stroke="#f1f5f9"`)
- "All accounts" table: update header style (uppercase, tracking)
- "Recent activity" feed: replace table-within-table with a clean list-item layout (flex row, coloured icon dot, name, date, amount)

### 4.3 Dashboard (Contas)

- Total patrimony card: improve label hierarchy
- Account cards: tighten spacing, tabular-nums on balance
- Filter bar: replace button groups with pill-style toggle tabs
- Table header: uppercase + tracking treatment
- Type/status badges: update to pill style

### 4.4 ReceitaView / DespesaView

- Header: add subtle `bg-white border-b border-slate-100` card style
- Expanded row panel: `bg-slate-50/50` instead of `bg-gray-50`
- PARCELAS section heading: uppercase + tracking
- Tipo badges: update to pill style

### 4.5 ParcelasTable

- Same table header treatment
- "Liquidar" button: indigo outline style
- "Estornar" button: amber outline style

### 4.6 LiquidarDialog / Other Dialogs

- Consistent label style (uppercase, tracking)
- Input focus rings: indigo

---

## 5. UX Rules Applied (UI/UX Pro Max)

| Rule | Implementation |
|---|---|
| `tabular-nums` | `font-variant-numeric: tabular-nums` via Tailwind `tabular-nums` class on all monetary values |
| `touch-target-size` | All nav items ≥36px, all buttons ≥36px, all icon buttons have `h-8 w-8` minimum |
| `loading-buttons` | Every async handler: `disabled={saving}` + spinner text ("A guardar…") — already partially done, make consistent |
| `color-semantic` | Green = revenue only, Red = expense only — never swap |
| `nav-state-active` | Left border indicator + bg highlight — visible and consistent |
| `8dp-spacing` | All padding/gap values on the 4/8px grid |
| `contrast-readability` | All text meets 4.5:1 on its background |
| `toast-dismiss` | Existing toast hook already auto-dismisses — keep |
| `confirmation-dialogs` | Existing ConfirmDialog — keep, just update styling |
| `animation-timing` | Tailwind `transition-colors`, `transition-all` durations stay at default 150ms |
| `icon-style-consistent` | Lucide icons only, 16px in tables, 18px in nav, 20px in KPI badges |
| `elevation-consistent` | `shadow-sm` on cards, `shadow-xl` on dialogs — no random values |

---

## 6. What Is NOT Changing

- All API calls, data shapes, and backend contracts
- All business logic (liquidar, estornar, criar, editar)
- All existing component prop interfaces
- Routing / view switching logic
- Toast hook behaviour
- Testcontainers / backend tests

---

## 7. Files to Modify

| File | Change |
|---|---|
| `ui/web/src/App.tsx` | Sidebar redesign |
| `ui/web/src/components/OverviewView.tsx` | KPI cards, chart, activity feed |
| `ui/web/src/components/Dashboard.tsx` | Account cards, filter bar, table header |
| `ui/web/src/components/ReceitaView.tsx` | Header, expanded panel, badges |
| `ui/web/src/components/DespesaView.tsx` | Header, expanded panel, badges |
| `ui/web/src/components/ParcelasTable.tsx` | Table header, badges, button styles |
| `ui/web/src/components/LiquidarDialog.tsx` | Label style, input focus |
| `ui/web/src/components/ColaboradorView.tsx` | Consistent badge/table treatment |
| `ui/web/src/components/FinanciamentoView.tsx` | Consistent badge/table treatment |
| `ui/web/src/components/SimulationView.tsx` | Consistent card/table treatment |
| `ui/web/src/components/ui/button.tsx` | Verify variant styles match palette |
| `ui/web/src/index.css` | Add `tabular-nums` utility if needed |

---

## 8. Out of Scope

- Dark mode (not requested, would double the effort)
- New features or views
- Charts library swap (recharts stays)
- Mobile app / Tauri-specific changes
- Backend / API changes
