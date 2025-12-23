require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://attendance-frontend-omega-eosin.vercel.app',
  credentials: true
}));
app.use(express.json());

// In-memory storage for allowed IPs
let allowedIPs = [];

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to the Attendance Backend API!',
    status: 'online',
    frontendUrl: process.env.FRONTEND_URL,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'attendance-backend',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/dashboard', (req, res) => {
  res.json({ 
    message: 'Welcome to the Dashboard!',
    totalIPs: allowedIPs.length,
    ips: allowedIPs
  });
});

app.post('/api/add-ip', (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ message: 'IP address is required' });
  }
  if (!allowedIPs.includes(ip)) {
    allowedIPs.push(ip);
  }
  res.json({ 
    message: 'IP added successfully', 
    allowedIPs,
    count: allowedIPs.length 
  });
});

app.get('/api/ips', (req, res) => {
  res.json({ 
    allowedIPs, 
    count: allowedIPs.length,
    message: 'Current IP list retrieved successfully'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}/`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'Not configured'}`);
  console.log(`📡 Backend URL: ${process.env.VERCEL_URL || `http://localhost:${PORT}`}`);
});