require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const commentRoutes = require('./routes/commentRoutes');
const slaRoutes = require('./routes/slaRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

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

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Helpdesk API is running' });
});

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));