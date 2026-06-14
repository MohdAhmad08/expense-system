const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const importRoutes = require('./routes/importRoutes');

const app = express();

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for local dev ease, configure for prod later
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/import', importRoutes);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Shared Expenses Manager API is running.' });
});

// Centralized error handler middleware
app.use(errorHandler);

module.exports = app;
