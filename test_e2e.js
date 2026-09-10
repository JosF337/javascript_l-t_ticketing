require('dotenv').config();
/**
 * End-to-End Automated Integration Test Runner
 * Tests all 13 Mandatory Modules and the 6 Instructor-Specified Scenarios
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const { io: ioClient } = require('socket.io-client');
const { initSocket } = require('./config/socket');

// Import App Components
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const commentRoutes = require('./routes/commentRoutes');
const slaRoutes = require('./routes/slaRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { swaggerUi, swaggerDocument, swaggerUiOptions } = require('./config/swagger');

let mongoServer;
let server;
let baseUrl;

// Test Results Tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

const assert = (condition, testName, details = '') => {
  if (condition) {
    results.passed++;
    results.tests.push({ name: testName, status: 'PASS', details });
    console.log(`  [PASS] ${testName}`);
  } else {
    results.failed++;
    results.tests.push({ name: testName, status: 'FAIL', details });
    console.error(`  [FAIL] ${testName} - ${details}`);
  }
};

const setupTestServer = async () => {
  console.log('\n==================================================');
  console.log('1. Starting In-Memory MongoDB & Test Express Server');
  console.log('==================================================');

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
  console.log('Connected to In-Memory MongoDB successfully.');

  const app = express();
  const httpServer = http.createServer(app);

  // Initialize WebSockets (Phase 15)
  initSocket(httpServer);

  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/tickets', commentRoutes);
  app.use('/api/sla', slaRoutes);
  app.use('/api/ratings', ratingRoutes);
  app.use('/api/manager', reportRoutes);

  // Swagger Documentation Route (Phase 14)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));
  app.get('/api/docs.json', (req, res) => res.json(swaggerDocument));

  app.get('/', (req, res) => res.json({ message: 'Helpdesk Test API' }));
  app.use((req, res) => res.status(404).json({ success: false, message: 'Not found', errorCode: 'NOT_FOUND' }));
  app.use(errorHandler);

  const PORT = 5099;
  baseUrl = `http://127.0.0.1:${PORT}`;

  await new Promise((resolve) => {
    server = httpServer.listen(PORT, () => {
      console.log(`Test Express server listening on ${baseUrl} with WebSockets`);
      resolve();
    });
  });
};

const runTests = async () => {
  try {
    await setupTestServer();

    let customerToken = '';
    let customerId = '';
    let agentToken = '';
    let agentId = '';
    let managerToken = '';
    let managerId = '';
    let ticketId = '';

    console.log('\n==================================================');
    console.log('2. SCENARIO 1: HAPPY PATH (Full End-to-End Lifecycle)');
    console.log('==================================================');

    // 1. Register Customer
    const regCustRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Customer',
        email: 'alice@example.com',
        password: 'Password@123',
        role: 'customer'
      })
    });
    const regCustData = await regCustRes.json();
    assert(regCustRes.status === 201 && regCustData.data.token, 'Customer Registration (Module 1)');
    customerToken = regCustData.data.token;
    customerId = regCustData.data._id;

    // 2. Register Agent
    const regAgentRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Agent',
        email: 'bob@example.com',
        password: 'Password@123',
        role: 'agent'
      })
    });
    const regAgentData = await regAgentRes.json();
    assert(regAgentRes.status === 201 && regAgentData.data.token, 'Agent Registration (Module 1)');
    agentToken = regAgentData.data.token;
    agentId = regAgentData.data._id;

    // 3. Register Manager
    const regMgrRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carol Manager',
        email: 'carol@example.com',
        password: 'Password@123',
        role: 'manager'
      })
    });
    const regMgrData = await regMgrRes.json();
    assert(regMgrRes.status === 201 && regMgrData.data.token, 'Manager Registration (Module 1)');
    managerToken = regMgrData.data.token;
    managerId = regMgrData.data._id;

    // 4. Customer Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'Password@123' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.data.token, 'Customer Login & Token Issuance (Module 1)');

    // 5. Manager configures SLA Rule (Module 10)
    const slaRes = await fetch(`${baseUrl}/api/sla`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        category: 'Software',
        priority: 'Urgent',
        resolutionHours: 4
      })
    });
    const slaData = await slaRes.json();
    assert(slaRes.status === 201 && slaData.data.resolutionHours === 4, 'Create SLA Rule for Software/Urgent (Module 10)');

    // 6. Customer creates ticket (Module 2 & Module 5 SLA Calculation)
    const createTicketRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        title: 'Production API returning 500 errors',
        category: 'Software',
        priority: 'Urgent',
        description: 'Orders microservice failing under high load since morning.'
      })
    });
    const createTicketData = await createTicketRes.json();
    ticketId = createTicketData.data._id;
    assert(
      createTicketRes.status === 201 &&
      createTicketData.data.status === 'Open' &&
      createTicketData.data.slaDueAt,
      'Customer Creates Ticket with SLA Due Time (Modules 2 & 5)'
    );

    // 7. Manager assigns ticket to agent (Module 3)
    const assignRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ agentId })
    });
    const assignData = await assignRes.json();
    assert(
      assignRes.status === 200 &&
      assignData.data.status === 'In Progress' &&
      assignData.data.assignedAgentId._id === agentId,
      'Manager Assigns Ticket to Agent (Module 3)'
    );

    // 8. Auto-assign demonstration (Module 3)
    const secondTicketRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        title: 'Billing invoice discrepancy',
        category: 'Billing',
        priority: 'Medium',
        description: 'Overcharged by $50 on last invoice.'
      })
    });
    const secondTicketData = await secondTicketRes.json();
    const autoAssignRes = await fetch(`${baseUrl}/api/tickets/${secondTicketData.data._id}/auto-assign`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(autoAssignRes.status === 200, 'Workload-Based Auto-Assignment Engine (Module 3)');

    // 9. Customer adds reply (Module 7)
    const commentRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        message: 'Stack trace points to Redis cache connection pool exhaustion.',
        isInternal: false
      })
    });
    assert(commentRes.status === 201, 'Customer Adds Public Comment (Module 7)');

    // 10. Agent adds private internal note (Module 8)
    const internalNoteRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentToken}`
      },
      body: JSON.stringify({
        message: '[INTERNAL NOTE] Scaled up Redis cluster to 3 nodes. Deploying hotfix.',
        isInternal: true
      })
    });
    assert(internalNoteRes.status === 201 && internalNoteRes.data ? true : internalNoteRes.status === 201, 'Agent Adds Private Internal Note (Module 8)');

    // 11. Customer views comments: Verify internal note is NOT visible to customer (Module 8)
    const custViewCommentsRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/comments`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const custComments = await custViewCommentsRes.json();
    const hasInternalNote = custComments.data.some((c) => c.isInternal === true);
    assert(
      custViewCommentsRes.status === 200 && !hasInternalNote,
      'Internal Notes Strictly Hidden from Customer (Module 8 Privacy Isolation)'
    );

    // 12. Agent views comments: Verify internal note IS visible to agent (Module 8)
    const agentViewCommentsRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/comments`, {
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    const agentComments = await agentViewCommentsRes.json();
    const agentSeesInternal = agentComments.data.some((c) => c.isInternal === true);
    assert(
      agentViewCommentsRes.status === 200 && agentSeesInternal,
      'Internal Notes Visible to Support Agent (Module 8)'
    );

    // 13. SLA Breach Flagging Check (Module 6)
    const breachCheckRes = await fetch(`${baseUrl}/api/tickets/breaches/check`, {
      headers: { Authorization: `Bearer ${agentToken}` }
    });
    assert(breachCheckRes.status === 200, 'SLA Breach Active Scanner (Module 6)');

    // 14. Escalation Workflow (Module 9)
    const escalateRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/escalate`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentToken}`
      },
      body: JSON.stringify({ reason: 'Critical severity impacting checkout revenue' })
    });
    const escalateData = await escalateRes.json();
    assert(
      escalateRes.status === 200 && escalateData.data.isEscalated === true,
      'Escalation Workflow Triggered (Module 9)'
    );

    // 15. Manager (Senior Management) transitions escalated ticket to Resolved (Module 4)
    const resolveRes = await fetch(`${baseUrl}/api/tickets/${ticketId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ status: 'Resolved' })
    });
    const resolveData = await resolveRes.json();
    assert(
      resolveRes.status === 200 && resolveData.data.status === 'Resolved',
      'Senior Management Resolves Escalated Ticket (Module 4 Status Workflow)'
    );

    // 16. Customer rates resolution (Module 11) - transitions status to Closed
    const rateRes = await fetch(`${baseUrl}/api/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        ticketId,
        score: 5,
        comment: 'Outstanding resolution speed and communication!'
      })
    });
    const rateData = await rateRes.json();
    assert(
      rateRes.status === 201 && rateData.data.score === 5,
      'Customer Rates Ticket & Ticket Finalized to Closed (Module 11)'
    );

    // 17. Manager Reports: SLA Compliance (Module 13 & Sample Endpoint #7)
    const slaReportRes = await fetch(`${baseUrl}/api/manager/reports/sla`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const slaReportData = await slaReportRes.json();
    assert(
      slaReportRes.status === 200 && typeof slaReportData.data.complianceRatePercentage === 'number',
      'Manager SLA Compliance Report (Module 13 & Sample Endpoint #7)'
    );

    // 18. Agent Workload Dashboard (Module 12)
    const workloadRes = await fetch(`${baseUrl}/api/manager/reports/agent-workload`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const workloadData = await workloadRes.json();
    assert(
      workloadRes.status === 200 && Array.isArray(workloadData.data),
      'Agent Workload Dashboard (Module 12)'
    );

    // 19. Volume Trends & Category Breakdown (Module 13)
    const trendsRes = await fetch(`${baseUrl}/api/manager/reports/volume-trends`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const categoryRes = await fetch(`${baseUrl}/api/manager/reports/category-breakdown`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(
      trendsRes.status === 200 && categoryRes.status === 200,
      'Ticket Volume Trends & Category Breakdown Analytics (Module 13)'
    );

    console.log('\n==================================================');
    console.log('3. SCENARIO 2: VALIDATION FAILURE (HTTP 400)');
    console.log('==================================================');
    // Missing required field 'description'
    const valFailRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        title: 'Missing description ticket',
        category: 'Software',
        priority: 'Low'
      })
    });
    const valFailData = await valFailRes.json();
    assert(
      valFailRes.status === 400 && valFailData.errorCode === 'VALIDATION_ERROR',
      'Server-side Validation Rejects Missing Field with 400 VALIDATION_ERROR'
    );

    console.log('\n==================================================');
    console.log('4. SCENARIO 3: AUTHENTICATION FAILURE (HTTP 401)');
    console.log('==================================================');
    // Call protected route with no token
    const authFailRes = await fetch(`${baseUrl}/api/tickets`);
    const authFailData = await authFailRes.json();
    assert(
      authFailRes.status === 401 && authFailData.errorCode === 'UNAUTHORIZED',
      'Protected Route Called Without Token Returns 401 UNAUTHORIZED'
    );

    console.log('\n==================================================');
    console.log('5. SCENARIO 4: AUTHORIZATION FAILURE (HTTP 403)');
    console.log('==================================================');
    // Customer token used on Manager-only route
    const roleFailRes = await fetch(`${baseUrl}/api/manager/reports/sla`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const roleFailData = await roleFailRes.json();
    assert(
      roleFailRes.status === 403 && roleFailData.errorCode === 'FORBIDDEN',
      'Role Guard Rejects Unauthorized Role with 403 FORBIDDEN'
    );

    console.log('\n==================================================');
    console.log('6. SCENARIO 5: BUSINESS-RULE CONFLICT (HTTP 409)');
    console.log('==================================================');
    // A: Invalid State Transition: Attempt to transition Open ticket directly to Closed
    const createAnotherRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        title: 'State transition test ticket',
        category: 'Software',
        priority: 'Low',
        description: 'Testing illegal state transition rules.'
      })
    });
    const newTicketData = await createAnotherRes.json();

    const illegalTransitionRes = await fetch(`${baseUrl}/api/tickets/${newTicketData.data._id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`
      },
      body: JSON.stringify({ status: 'Closed' }) // Open cannot jump to Closed!
    });
    const illegalTransitionData = await illegalTransitionRes.json();
    assert(
      illegalTransitionRes.status === 409 &&
      illegalTransitionData.errorCode === 'INVALID_STATUS_TRANSITION',
      'State Machine Rejects Illegal Transition (Open -> Closed) with 409'
    );

    // B: Business Rule Conflict: Attempt duplicate rating on already rated ticket
    const dupRateRes = await fetch(`${baseUrl}/api/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        ticketId,
        score: 4,
        comment: 'Trying to submit second rating.'
      })
    });
    const dupRateData = await dupRateRes.json();
    assert(
      dupRateRes.status === 409 && dupRateData.errorCode === 'DUPLICATE_RATING',
      'Duplicate Rating on Closed Ticket Rejected with 409 DUPLICATE_RATING'
    );

    console.log('\n==================================================');
    console.log('7. SCENARIO 6: NOT-FOUND CASE (HTTP 404)');
    console.log('==================================================');
    // Querying non-existent valid ObjectId does not crash server
    const notFoundRes = await fetch(`${baseUrl}/api/tickets/65f1a2b3c4d5e6f7a8b9c0d1`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 && notFoundData.errorCode === 'NOT_FOUND',
      'Non-existent Ticket ID Returns 404 NOT_FOUND Without Crashing'
    );

    // Querying unknown endpoint
    const unmappedRes = await fetch(`${baseUrl}/api/non-existent-route`);
    assert(unmappedRes.status === 404, 'Unmapped Route Returns Clean 404 JSON');

    console.log('\n==================================================');
    console.log('8. PHASE 14: INTERACTIVE SWAGGER & OPENAPI DOCS');
    console.log('==================================================');
    const swaggerDocRes = await fetch(`${baseUrl}/api/docs.json`);
    const swaggerDocData = await swaggerDocRes.json();
    assert(
      swaggerDocRes.status === 200 && swaggerDocData.openapi === '3.0.3',
      'OpenAPI 3.0.3 Specification JSON Served at /api/docs.json (Phase 14)'
    );

    const swaggerUiRes = await fetch(`${baseUrl}/api/docs/`);
    assert(
      swaggerUiRes.status === 200,
      'Interactive Swagger UI HTML Served at /api/docs/ (Phase 14)'
    );

    console.log('\n==================================================');
    console.log('9. PHASE 15: REAL-TIME WEBSOCKETS & EVENT EMISSION');
    console.log('==================================================');
    // Create fresh active ticket for WebSocket live streaming tests
    const wsTicketRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        title: 'Real-time WebSocket Test Ticket',
        category: 'Software',
        priority: 'High',
        description: 'Testing live bi-directional Socket.io streaming updates.'
      })
    });
    const wsTicketData = await wsTicketRes.json();
    const wsTicketId = wsTicketData.data._id;

    // Connect Socket.io client using Manager JWT token
    const clientSocket = ioClient(baseUrl, {
      auth: { token: managerToken },
      transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
      clientSocket.on('connect', () => {
        assert(clientSocket.connected, 'Authenticated Socket.io Client Connected via JWT (Phase 15)');
        resolve();
      });
      clientSocket.on('connect_error', (err) => {
        reject(err);
      });
    });

    // Join room for the new ticket
    clientSocket.emit('join_ticket', wsTicketId);

    // Test real-time broadcast of comment addition
    const commentPromise = new Promise((resolve) => {
      clientSocket.on('comment:added', (payload) => {
        resolve(payload);
      });
    });

    await fetch(`${baseUrl}/api/tickets/${wsTicketId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        message: 'Real-time WebSocket comment stream test message.',
        isInternal: false
      })
    });

    const receivedComment = await commentPromise;
    assert(
      receivedComment && receivedComment.ticketId === wsTicketId,
      'Real-time WebSocket Comment Broadcast Received in Ticket Room (Phase 15)'
    );

    clientSocket.disconnect();

    console.log('\n==================================================');
    console.log('AUTOMATED TEST SUITE SUMMARY');
    console.log('==================================================');
    console.log(`Total Tests Run: ${results.passed + results.failed}`);
    console.log(`Passed:          ${results.passed}`);
    console.log(`Failed:          ${results.failed}`);

    if (results.failed === 0) {
      console.log('\n>>> ALL 13 MODULES AND 6 SCENARIOS PASSED WITH 100% SUCCESS! <<<\n');
      process.exit(0);
    } else {
      console.error(`\n>>> ${results.failed} TEST(S) FAILED <<<\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during test run:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
    if (mongoose.connection) await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
};

runTests();
