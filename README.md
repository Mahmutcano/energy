# Industrial Energy Monitoring (SCADA) Platform

A general-purpose SaaS platform for monitoring industrial energy telemetry using the IEC 60870-5-104 protocol.

## 🚀 Quick Start

The platform is currently running in **Simulation Mode** (mocked database and telemetry) to allow immediate exploration.

- **Frontend:** [https://hearty-embrace-production-217d.up.railway.app](https://hearty-embrace-production-217d.up.railway.app)
- **Backend API:** [https://energy-production-5fa5.up.railway.app](https://energy-production-5fa5.up.railway.app)
- **Database (Postgres):** `postgres-production-f0d0.up.railway.app`
- **Redis:** `redis-production-fafc.up.railway.app`

## 🏗️ Architecture

- **Backend (Node.js/TypeScript):**
  - **IEC 104 Service:** Handles TCP connections to RTU devices (simulated).
  - **Socket.io:** Streams real-time telemetry to the frontend.
  - **Alarm Engine:** Monitors threshold violations in real-time.
  - **RBAC:** Simple Role-Based Access Control middleware for Super Admin, Admin, and Customer roles.

- **Frontend (Next.js/React):**
  - **Dashboard:** Real-time monitoring of Active Power, Voltage, and Current.
  - **Analytics:** Post-processing and historical data visualization using ECharts.
  - **Devices:** Management of RTU connections and IOA (Information Object Address) mapping.
  - **Alarms:** Centralized log for system alerts and threshold triggers.

## 🛠️ Environment Variables (.env)

### Backend
- `PORT`: 3001
- `DATABASE_URL`: PostgreSQL connection string (Prisma)
- `INFLUX_URL`: InfluxDB connection string
- `INFLUX_TOKEN`: Authentication token for InfluxDB

## 🎨 Design System
- **Theme:** Industrial Dark Mode
- **Typography:** Inter (San-serif)
- **Icons:** Lucide-React
- **Animations:** Framer Motion

Produced by **Antigravity**.
