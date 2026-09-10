# Customer Support Helpdesk & Ticketing System Backend API (P14)

A production-grade RESTful API built with Node.js, Express, MongoDB, and Mongoose for managing customer support operations, dynamic SLA tracking, automated workload dispatching, role-based access control, threaded conversations with private internal notes, escalation workflows, customer satisfaction ratings, and real-time manager intelligence reports.

---

## 🌟 Key Architectural Highlights

- **Role-Based Access Control (RBAC):** Granular authorization for `customer`, `agent`, `manager`, and `admin` roles.
- **Dynamic SLA Engine:** Database-driven SLA resolution rules (`SlaRule`) with automatic deadline computation upon ticket submission.
- **Strict State Machine Lifecycle:** Finite-state transitions (`Open` → `In Progress` → `On Hold` / `Resolved` → `Closed`) preventing illegal status bypasses.
- **Smart Workload-Based Auto-Assignment:** Balances active caseloads among available support agents.
- **Threaded Communication & Privacy Isolation:** Public comments for customer communication and private internal notes strictly hidden from non-staff.
- **Active SLA Breach Detection:** Scans and tags breached tickets on query and via dedicated maintenance endpoints.
- **Manager Intelligence & BI Aggregations:** MongoDB aggregation pipelines for SLA compliance rates, agent workload metrics, daily volume trends, and category distribution.
- **Standardized Error Architecture:** Consistent HTTP error envelopes with explicit machine-readable `errorCode` tags (400 `VALIDATION_ERROR`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`).

---

## 🛠️ Technology Stack

- **Runtime & Framework:** Node.js (CommonJS), Express.js (v5)
- **Database & ODM:** MongoDB, Mongoose (v9)
- **Authentication & Security:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **Request Validation:** Joi Schema Validation (`joi`)

## 📁 Project Directory Structure

```text
├── client/                         # React + Vite Interactive Frontend SPA (Phase 17)
│   ├── src/
│   │   ├── components/             # Dashboard views, modals, cards, toast alerts
│   │   ├── services/               # Universal API client & Socket.io client
│   │   ├── App.jsx                 # Main application controller & role switcher
│   │   └── index.css               # Ultra-premium Dark Mode glassmorphism design system
│   └── package.json
├── config/
│   ├── db.js                       # MongoDB connection logic
│   ├── socket.js                   # Socket.io initialization, JWT auth, and live event emitters
│   └── swagger.js                  # OpenAPI 3.0 specification & Swagger UI setup
├── controllers/
│   ├── authController.js           # User registration, login, and profile fetching
│   ├── ticketController.js         # Ticket CRUD, assignment, status transition, escalation
│   ├── commentController.js        # Public replies & private internal notes with isolation
│   ├── slaController.js            # Dynamic SLA rule creation and management
│   ├── ratingController.js         # Customer resolution rating and feedback
│   └── reportController.js         # SLA compliance, agent workload, volume & category analytics
├── middleware/
│   ├── auth.js                     # JWT verification and user population
│   ├── roleCheck.js                # Role-based endpoint guards
│   ├── validate.js                 # Joi schema validation middleware
│   └── errorHandler.js             # Centralized error handler & status mapping
├── models/
│   ├── User.js                     # User schema (customer, agent, manager, admin)
│   ├── Ticket.js                   # Ticket schema with SLA deadlines and escalation flags
│   ├── Comment.js                  # Threaded comments and internal notes
│   ├── SlaRule.js                  # Dynamic category/priority SLA definitions
│   └── Rating.js                   # Customer resolution satisfaction ratings
├── routes/
│   ├── authRoutes.js               # /api/auth endpoints
│   ├── ticketRoutes.js             # /api/tickets endpoints
│   ├── commentRoutes.js            # /api/tickets/:id/comments endpoints
│   ├── slaRoutes.js                # /api/sla endpoints
│   ├── ratingRoutes.js             # /api/ratings endpoints
│   └── reportRoutes.js             # /api/manager/reports endpoints
├── utils/
│   ├── AppError.js                 # Custom operational error class
│   ├── generateToken.js            # JWT signing helper
│   ├── responseHelper.js           # Standardized JSON response envelope helpers
│   └── slaHelper.js                # SLA deadline calculation and breach evaluation
├── .dockerignore                   # Docker build ignore rules
├── .env.example                    # Environment variable template
├── Dockerfile                      # Multi-stage production container definition
├── docker-compose.yml              # Orchestration for Express API & MongoDB
├── package.json                    # Dependencies and npm scripts
├── postman_collection.json         # Postman collection covering all endpoints & test scenarios
├── seed.js                         # Database seeder with realistic sample data
├── server.js                       # Express app bootstrap & route registration
└── test_e2e.js                     # Automated in-memory E2E integration test suite
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance (local or Atlas connection URI)

### 2. Installation
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the project root:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/helpdesk_db
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```

### 4. Seed Sample Data
Populates default SLA rules, users across all roles, and sample tickets:
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
# or
npm start
```
Server will be active at `http://localhost:5000`.

---

## 🐳 Docker & Multi-Container Setup (Phase 16)

You can spin up both the MongoDB database and the Express/WebSocket API with a single command:

### 1. Build and Run Entire Stack
```bash
docker compose up --build -d
```

### 2. Run Database Seeder inside Container
```bash
docker compose run --rm seed
```

### 3. Check Container Health & Logs
```bash
docker compose ps
docker compose logs -f api
```

### 4. Stop Containers
```bash
docker compose down
# or remove volumes as well:
docker compose down -v
```

---

## 🧪 Running Automated E2E Tests

The project includes an in-memory automated test suite verifying all **13 mandatory modules** and **6 required test scenarios**:

```bash
npm run test:e2e
```

### Summary of Tested Scenarios:
1. **Scenario 1: Happy Path:** End-to-end flow from user registration, SLA rule creation, ticket submission, workload auto-assignment, threaded commenting, internal notes privacy verification, active breach scanning, ticket escalation, resolution, customer feedback rating, and manager report generation.
2. **Scenario 2: Validation Failure (HTTP 400):** Rejection of malformed requests with `VALIDATION_ERROR`.
3. **Scenario 3: Authentication Failure (HTTP 401):** Rejection of unauthenticated requests with `UNAUTHORIZED`.
4. **Scenario 4: Authorization Failure (HTTP 403):** Role guard rejection on restricted actions with `FORBIDDEN`.
5. **Scenario 5: Business-Rule Conflict (HTTP 409):** Illegal state transitions (`Open` → `Closed`) and duplicate feedback prevention.
6. **Scenario 6: Not-Found Case (HTTP 404):** Graceful `NOT_FOUND` handling for non-existent IDs and unmapped routes.

---
 
## 📖 Interactive Swagger / OpenAPI Documentation (Phase 14)

Once the server is running, open your browser and navigate to:
- **Interactive Swagger UI:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Raw OpenAPI 3.0.3 JSON Spec:** [http://localhost:5000/api/docs.json](http://localhost:5000/api/docs.json)

The interactive documentation provides:
- Live "Try It Out" execution directly from the browser
- Interactive Bearer JWT Token authorization modal
- Comprehensive parameter descriptions, status codes, and JSON schemas for all 13 modules

---
 
## ⚡ Real-Time WebSockets & Live Event Streaming (Phase 15)

The server runs a fully authenticated Socket.io engine on the same port with JWT authorization.

### Client Connection Example
```javascript
const { io } = require('socket.io-client');

const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' },
  transports: ['websocket']
});

// Join live ticket channel
socket.emit('join_ticket', 'TICKET_ID_HERE');

// Listen for live public comments
socket.on('comment:added', ({ ticketId, comment }) => {
  console.log('New comment received in real-time:', comment);
});

// Listen for status changes
socket.on('ticket:status_changed', (updatedTicket) => {
  console.log('Ticket status updated:', updatedTicket.status);
});

// Staff-only internal note broadcasts (automatically scoped to agent/manager roles)
socket.on('comment:internal_note', ({ ticketId, comment }) => {
  console.log('Staff-only internal note:', comment);
});
```

### Event Streaming Matrix
| Event Name | Target Room / Channel | Description |
| :--- | :--- | :--- |
| `ticket:created` | `role:agent`, `role:manager`, `role:admin` | Emitted when a new ticket is submitted by a customer |
| `ticket:assigned` | `user:<agentId>`, `ticket:<ticketId>` | Emitted when a ticket is assigned or auto-dispatched |
| `ticket:status_changed` | `ticket:<ticketId>`, `user:<customerId>` | Emitted on status transitions (`In Progress`, `Resolved`, `Closed`) |
| `ticket:escalated` | `role:manager`, `role:admin`, `ticket:<ticketId>` | Emitted when a ticket is escalated to Senior Management |
| `comment:added` | `ticket:<ticketId>` | Broadcasts public messages to all room subscribers |
| `comment:internal_note` | `role:agent`, `role:manager`, `role:admin` | **Strict Staff Isolation:** Never emitted to customer rooms |
| `rating:submitted` | `role:manager`, `role:admin` | Emitted when customer completes satisfaction rating |
| `sla:breach_alert` | `role:agent`, `role:manager`, `role:admin` | Emitted when an active ticket breaches its resolution deadline |

---
 
## 💻 Interactive Frontend Dashboard (Phase 17)

The project includes a React 18 + Vite Single Page Application (SPA) designed with dark-mode aesthetic, live Socket.io updates, SLA countdown clocks, and role-tailored workspaces:

### 1. Run Frontend in Development Mode (Vite Dev Server)
```bash
npm run client:dev
```
Access the client directly at: [http://localhost:5173](http://localhost:5173)

### 2. Run Frontend via Express Unified Production Server
```bash
# Build the client bundle (already generated in client/dist)
npm run client:build

# Start the Express server
npm start
```
Access the unified application directly at: [http://localhost:5000](http://localhost:5000)

### Frontend Highlights
- **1-Click Role Switcher:** Instant demo login as `Customer` (Diana), `Agent` (Alice), or `Manager` (Sarah) without typing passwords.
- **Dynamic SLA Predictor:** Real-time calculation banner estimating SLA target hours before ticket creation.
- **Staff-Only Internal Notes Toggle:** Private troubleshooting notes isolated from customer view.
- **Interactive State Transitions:** Strictly displays only valid next state transition buttons according to the Finite State Machine.
- **Executive BI Analytics:** Live SLA compliance dials, agent resolution velocity charts, and daily volume trends.
- **5-Star Customer Rating & Confetti:** Interactive rating stars widget on resolved tickets with celebratory particle confetti.

---

## 📬 Postman Collection

Import `postman_collection.json` into Postman to test all API routes directly. The collection contains pre-configured requests, environment variable chaining, and sample payloads for each endpoint.
