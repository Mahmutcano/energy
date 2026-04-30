# Energy SCADA Platform - Grafana-Inspired UI/UX Design System

This document outlines the architectural and design bridge between the Go backend services and the Next.js frontend interface. The objective is to achieve a high-fidelity, "Grafana-style" SCADA dashboard that is performant, real-time, and technically robust.

---

## 1. Data-to-UI Mapping (Stitch Architecture)

| Frontend Component | Data Source (Backend) | Update Mechanism | Visual Type |
| :--- | :--- | :--- | :--- |
| **Main Metrics Panel** | `broadcasterSvc` / `socket.io` | Real-time (Push) | Time Series / Gauge |
| **Plant Management** | `/api/plants` | REST (GET/POST/PATCH) | Data Source Grid |
| **Device Configuration** | `/api/devices` | REST (GET/POST/PATCH) | Technical Table |
| **Protocol Management** | `/api/comm-protocols` | REST (GET/POST/PATCH) | List View |
| **System Health Bar** | `/system/protocol-statuses` | Polling (10s) | LED Status Dots |
| **Heartbeat Monitor** | `/system/health-check` | Polling (30s) | Pulse Indicator |
| **Alarm Ticker** | `/api/alarms` | Socket.io / REST | Infinite List |
| **YTBS Configuration** | `/api/ytbs/*` (ADMIN ONLY) | REST | Secure Settings |

### Role-Based Access Control (RBAC)
- **Role:** `ADMIN` (Middleware: `RoleMiddleware("ADMIN")`)
- **UI Constraint:** The Sidebar will dynamically hide/lock the **YTBS Settings**, **System Admin**, and **User Management** sections for non-admin users.

---

## 2. Grafana Design Language (UI/UX Specification)

### Color Palette (Grafana Dark Mode)
- **Background (Main):** `#0b0c0e` (Deepest dark)
- **Panel Surface:** `#141619` (Slightly lighter surface for elevation)
- **Borders/Dividers:** `#262626`
- **Text Primary:** `#d8d9da`
- **Text Secondary:** `#7b7b7b`
- **Accent (Success):** `#73bf69` (Green)
- **Accent (Alert):** `#f2495c` (Red)
- **Accent (Warning):** `#ff9830` (Orange)
- **Accent (Info):** `#5794f2` (Blue)

### Typography
- **Primary:** `Inter, sans-serif` (Clean, modern UI)
- **Data/Monospaced:** `Roboto Mono, monospace` (For metric values, logs, and technical IDs)

### Chart Standards
- **Grid Lines:** Color `#2c2c2c`, very thin (0.5px - 1px).
- **Time Series:** Line weight 1.5px, Area Fill 10% opacity.
- **Gauges:** Minimalistic arcs with color-coded thresholds.

---

## 3. Frontend Architecture

### Component Directory Structure (Atomic Design)
```
src/
├── components/
│   ├── Panels/       # Metric cards, Time-series graphs, Gauges
│   ├── Layout/       # Sidebar, Topbar, Breadcrumbs
│   ├── Forms/        # Add/Edit Plant, Device Config
│   ├── UI/           # Buttons, Inputs, Modals (Grafana-styled)
│   └── Status/       # Health indicators, Progress bars
├── services/
│   ├── api.ts        # Axios instances for REST
│   └── socket.ts     # Socket.io connection and listeners
├── context/
│   └── AuthContext   # User sessions and Role-based filtering
└── app/              # Next.js App Router (Pages)
```

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        grafana: {
          bg: '#0b0c0e',
          surface: '#141619',
          border: '#262626',
          grid: '#2c2c2c',
          text: {
            primary: '#d8d9da',
            secondary: '#7b7b7b',
          },
          accent: {
            green: '#73bf69',
            red: '#f2495c',
            orange: '#ff9830',
            blue: '#5794f2',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['Roboto Mono', 'ui-monospace', 'SFMono-Regular'],
      },
    },
  },
}
```

---

## 4. Implementation Guidelines

1. **Socket Integration:** The `broadcasterSvc` emits telemetry. Use a custom hook `useTelemetry(deviceId)` that joins a specific room via Socket.io and updates local state.
2. **Grid Consistency:** All management pages must use a unified "Technical Grid" component that mimics Grafana's Data Sources view (Clean, bordered, actionable items).
3. **Admin Hierarchy:** 
    - Dashboard (Public/User)
    - Analytics (Public/User)
    - Plants (Admin)
    - Devices (Admin)
    - YTBS (Admin)
    - System (Admin)
4. **Performance:** Use React-Window or similar virtualization for the Alarm List if it exceeds 100 entries. Use `memo` on high-frequency Chart components to prevent re-render lag.
