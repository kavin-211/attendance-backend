require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for allowed IPs (for now)
let allowedIPs = [];

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Attendance Backend API!' });
});

app.get('/dashboard', (req, res) => {
  res.json({ message: 'Welcome to the Dashboard!' });
});

app.post('/add-ip', (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ message: 'IP address is required' });
  }
  if (!allowedIPs.includes(ip)) {
    allowedIPs.push(ip);
  }
  res.json({ message: 'IP added successfully', allowedIPs });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
