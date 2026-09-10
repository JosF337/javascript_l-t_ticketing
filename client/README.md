# SupportX Helpdesk Client (Angular 18 Standalone Architecture)

Modern, reactive Angular single-page application (SPA) for the Customer Support Helpdesk & Ticketing System.

## Features
- **Standalone Components & RxJS / Signals**: Zero-boilerplate component architecture with reactive streams.
- **WebSocket Real-Time Integration**: Instant event streaming with Socket.io (`ticket:created`, `ticket:assigned`, `ticket:status_changed`, `comment:added`, `sla:breach_alert`).
- **Obsidian Dark Glassmorphic Design System**: Polished CSS variables, backdrop blur filters, glowing badges, and interactive modals.
- **Role-Based Portals**:
  - **Customer Portal**: Live SLA countdowns, ticket ingestion, ratings (CSAT).
  - **Agent Portal**: Caseload metrics, queue claiming, state machine controls, staff-only internal notes.
  - **Manager Portal**: Executive BI KPIs, SLA compliance rates, agent workload distribution, SLA matrix rule CRUD.
- **1-Click Persona Switcher**: Instant switching between Customer, Agent, Manager, and Admin demo accounts.

## Running Locally
```bash
# Start standalone Angular dev server on port 5173
npm run dev

# Compile production bundle to dist/
npm run build
```
