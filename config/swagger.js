const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Customer Support Helpdesk & Ticketing System API (P14)',
    version: '1.0.0',
    description: `
**Production-Grade RESTful API for Customer Support Operations (CIA-3 Project P14)**

### 🌟 Core Architectural Features
- **Granular RBAC:** Role guards for \`customer\`, \`agent\`, \`manager\`, and \`admin\`
- **Dynamic SLA Rule Engine:** Resolution deadlines computed automatically from database SLA matrix
- **Strict State Machine:** Valid transitions (\`Open\` ➔ \`In Progress\` ➔ \`On Hold\` / \`Resolved\` ➔ \`Closed\`)
- **Workload-Based Auto-Assignment:** Balances active caseload across support agents
- **Threaded Communication & Privacy Isolation:** Public client comments + private internal notes hidden from customers
- **Manager BI Aggregation Pipelines:** SLA compliance, agent workload, volume trends, category breakdowns
- **Standardized Error Envelopes:** Explicit machine-readable error codes (\`VALIDATION_ERROR\`, \`UNAUTHORIZED\`, \`FORBIDDEN\`, \`NOT_FOUND\`, \`INVALID_STATUS_TRANSITION\`, \`DUPLICATE_RATING\`)
    `,
    contact: {
      name: 'Support API Team'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Express Server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: Bearer <token>'
      }
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid request parameters' },
          errorCode: { type: 'string', example: 'VALIDATION_ERROR' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Alice Customer' },
          email: { type: 'string', format: 'email', example: 'alice@example.com' },
          password: { type: 'string', example: 'Password@123' },
          role: { type: 'string', enum: ['customer', 'agent', 'manager', 'admin'], default: 'customer' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'alice@example.com' },
          password: { type: 'string', example: 'Password@123' }
        }
      },
      CreateTicketRequest: {
        type: 'object',
        required: ['title', 'category', 'priority', 'description'],
        properties: {
          title: { type: 'string', example: 'Production API returning 500 errors' },
          category: { type: 'string', enum: ['Software', 'Hardware', 'Network', 'Billing'], example: 'Software' },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'], example: 'Urgent' },
          description: { type: 'string', example: 'Orders microservice failing under high load.' }
        }
      },
      AssignTicketRequest: {
        type: 'object',
        required: ['agentId'],
        properties: {
          agentId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' }
        }
      },
      UpdateStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['In Progress', 'On Hold', 'Resolved', 'Closed'], example: 'Resolved' }
        }
      },
      EscalateTicketRequest: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string', example: 'Critical severity impacting payment checkout service.' }
        }
      },
      CreateCommentRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', example: 'Investigating Redis cache connection pool metrics.' },
          isInternal: { type: 'boolean', default: false, example: false }
        }
      },
      CreateSlaRuleRequest: {
        type: 'object',
        required: ['category', 'priority', 'resolutionHours'],
        properties: {
          category: { type: 'string', example: 'Software' },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'], example: 'Urgent' },
          resolutionHours: { type: 'number', minimum: 1, example: 4 }
        }
      },
      CreateRatingRequest: {
        type: 'object',
        required: ['ticketId', 'score'],
        properties: {
          ticketId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d2' },
          score: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          comment: { type: 'string', example: 'Fast resolution and clear communication!' }
        }
      }
    }
  },
  tags: [
    { name: '01. Authentication & Profile', description: 'User registration, login, and profile fetching (Module 1)' },
    { name: '02. Tickets & Ingestion', description: 'Ticket creation, query filtering, and details with SLA deadline (Module 2)' },
    { name: '03. Assignment & Smart Dispatch', description: 'Manual assignment and automated workload-balancing dispatch (Module 3)' },
    { name: '04. Lifecycle & State Machine', description: 'Strict finite state machine ticket transitions (Module 4)' },
    { name: '05. Comments & Internal Notes', description: 'Public discussion & private internal notes with isolation (Modules 7 & 8)' },
    { name: '06. SLA Management & Scanner', description: 'Active SLA breach scanning and rules CRUD (Modules 5, 6 & 10)' },
    { name: '07. Escalation Workflow', description: 'Ticket escalation to senior management (Module 9)' },
    { name: '08. Customer Satisfaction Ratings', description: '1-5 star ratings on resolved tickets & closing (Module 11)' },
    { name: '09. Manager Analytics & BI', description: 'SLA compliance, agent workload, trends, and category breakdown (Modules 12 & 13)' }
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['01. Authentication & Profile'],
        summary: 'Register a new user',
        description: 'Creates a user account (customer, agent, manager, admin) and issues JWT.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } }
        },
        responses: {
          201: { description: 'User registered successfully', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['01. Authentication & Profile'],
        summary: 'User login',
        description: 'Authenticates credentials and returns a signed JWT token.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
        },
        responses: {
          200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['01. Authentication & Profile'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Profile details returned', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/tickets': {
      post: {
        tags: ['02. Tickets & Ingestion'],
        summary: 'Create a new support ticket',
        security: [{ BearerAuth: [] }],
        description: 'Submits a ticket and automatically calculates dynamic SLA resolution deadline.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTicketRequest' } } }
        },
        responses: {
          201: { description: 'Ticket created with SLA deadline', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Validation failure', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      get: {
        tags: ['02. Tickets & Ingestion'],
        summary: 'List tickets with role-scoping and query filters',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status (Open, In Progress, On Hold, Resolved, Closed)' },
          { name: 'priority', in: 'query', schema: { type: 'string' }, description: 'Filter by priority (Low, Medium, High, Urgent)' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category (Software, Hardware, etc.)' },
          { name: 'breached', in: 'query', schema: { type: 'string' }, description: 'Filter only breached tickets (true/false)' }
        ],
        responses: {
          200: { description: 'List of tickets', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    },
    '/api/tickets/{id}': {
      get: {
        tags: ['02. Tickets & Ingestion'],
        summary: 'Get ticket details by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Ticket details retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Ticket not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      delete: {
        tags: ['02. Tickets & Ingestion'],
        summary: 'Delete ticket (Manager/Admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Ticket deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          403: { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/tickets/{id}/assign': {
      put: {
        tags: ['03. Assignment & Smart Dispatch'],
        summary: 'Manually assign ticket to agent (Manager/Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AssignTicketRequest' } } }
        },
        responses: {
          200: { description: 'Ticket assigned and transitioned to In Progress', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          400: { description: 'Invalid agent ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/tickets/{id}/auto-assign': {
      put: {
        tags: ['03. Assignment & Smart Dispatch'],
        summary: 'Automatically assign ticket based on agent workload (Manager/Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Ticket auto-assigned to agent with lowest active caseload', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    },
    '/api/tickets/{id}/status': {
      put: {
        tags: ['04. Lifecycle & State Machine'],
        summary: 'Update ticket status (Strict State Machine Enforcement)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateStatusRequest' } } }
        },
        responses: {
          200: { description: 'Status updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          409: { description: 'Illegal state transition rejected', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/tickets/{id}/comments': {
      post: {
        tags: ['05. Comments & Internal Notes'],
        summary: 'Add public comment or private internal note to ticket',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCommentRequest' } } }
        },
        responses: {
          201: { description: 'Comment recorded', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      },
      get: {
        tags: ['05. Comments & Internal Notes'],
        summary: 'Get threaded comments (Internal notes isolated from customers)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Threaded comments returned according to role visibility', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    },
    '/api/tickets/breaches/check': {
      get: {
        tags: ['06. SLA Management & Scanner'],
        summary: 'Active SLA breach scan across all open tickets',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Scan complete with breach count', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    },
    '/api/tickets/{id}/escalate': {
      put: {
        tags: ['07. Escalation Workflow'],
        summary: 'Escalate ticket to Senior Management',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EscalateTicketRequest' } } }
        },
        responses: {
          200: { description: 'Ticket escalated', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    },
    '/api/sla': {
      post: {
        tags: ['06. SLA Management & Scanner'],
        summary: 'Create new SLA rule (Manager/Admin)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSlaRuleRequest' } } }
        },
        responses: {
          201: { description: 'SLA rule created', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      },
      get: {
        tags: ['06. SLA Management & Scanner'],
        summary: 'List all SLA rules',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'SLA rules list', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    },
    '/api/sla/{id}': {
      put: {
        tags: ['06. SLA Management & Scanner'],
        summary: 'Update SLA rule (Manager/Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSlaRuleRequest' } } }
        },
        responses: {
          200: { description: 'SLA rule updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      },
      delete: {
        tags: ['06. SLA Management & Scanner'],
        summary: 'Delete SLA rule (Manager/Admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'SLA rule deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    },
    '/api/ratings': {
      post: {
        tags: ['08. Customer Satisfaction Ratings'],
        summary: 'Submit customer satisfaction rating on resolved ticket',
        security: [{ BearerAuth: [] }],
        description: 'Records 1-5 star score and transitions ticket to Closed.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRatingRequest' } } }
        },
        responses: {
          201: { description: 'Rating recorded and ticket closed', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          409: { description: 'Duplicate rating rejected', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/ratings/ticket/{ticketId}': {
      get: {
        tags: ['08. Customer Satisfaction Ratings'],
        summary: 'Get rating for a specific ticket',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Rating details retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          404: { description: 'Rating not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/manager/reports/sla': {
      get: {
        tags: ['09. Manager Analytics & BI'],
        summary: 'Get SLA Compliance Analytics Report (Sample Endpoint #7)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'SLA compliance metrics', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } },
          403: { description: 'Forbidden (Manager/Admin only)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/api/manager/reports/agent-workload': {
      get: {
        tags: ['09. Manager Analytics & BI'],
        summary: 'Get Agent Workload and Performance Dashboard (Module 12)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Agent workload metrics', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    },
    '/api/manager/reports/volume-trends': {
      get: {
        tags: ['09. Manager Analytics & BI'],
        summary: 'Get Ticket Volume Creation Trends (Module 13)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Daily ticket volume trend list', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    },
    '/api/manager/reports/category-breakdown': {
      get: {
        tags: ['09. Manager Analytics & BI'],
        summary: 'Get Ticket Category Distribution Breakdown (Module 13)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Category volume breakdown', content: { 'application/json': { schema: { $ref: '#/components/schemas/StandardResponse' } } } }
        }
      }
    }
  }
};

const swaggerUiOptions = {
  customSiteTitle: 'Helpdesk API Documentation - P14',
  customCss: `
    .swagger-ui .topbar { background-color: #0f172a; border-bottom: 2px solid #38bdf8; }
    .swagger-ui .info .title { color: #0284c7; }
    .swagger-ui .scheme-container { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
  `
};

module.exports = {
  swaggerUi,
  swaggerDocument,
  swaggerUiOptions
};
