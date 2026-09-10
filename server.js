require('dotenv').config();
const http = require('http');
const express = require('express');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { initSocket } = require('./config/socket');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const commentRoutes = require('./routes/commentRoutes');
const slaRoutes = require('./routes/slaRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const httpServer = http.createServer(app);

// Initialize WebSockets (Phase 15)
initSocket(httpServer);

// Connect to MongoDB
connectDB();

// Body parser
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tickets', commentRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/manager', reportRoutes);

// Swagger Documentation Route (Phase 14)
const { swaggerUi, swaggerDocument, swaggerUiOptions } = require('./config/swagger');
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));
app.get('/api/docs.json', (req, res) => res.json(swaggerDocument));

// Serve Angular Frontend Static Build if present (Phase 17)
const path = require('path');
const fs = require('fs');
const clientDistBrowser = path.join(__dirname, 'client', 'dist', 'browser');
const clientDistRoot = path.join(__dirname, 'client', 'dist');
const clientDistPath = fs.existsSync(path.join(clientDistBrowser, 'index.html'))
  ? clientDistBrowser
  : (fs.existsSync(path.join(clientDistRoot, 'index.html')) ? clientDistRoot : null);

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // Health check fallback if client not built
  app.get('/', (req, res) => {
    res.json({
      message: 'Customer Support Helpdesk & Ticketing System API is running',
      documentationUrl: '/api/docs',
      webSockets: 'Active on same port with JWT auth'
    });
  });
}

// Handle undefined API routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    errorCode: 'NOT_FOUND'
  });
});

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT} with WebSockets enabled`));