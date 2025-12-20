require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Global array for allowed IPs (employee and admin IPs)
let allowedIPs = [];

// Helper function to get client IP
function getClientIP(req) {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
}

// Helper function to check if IP is in same subnet as server
function isInSameSubnet(clientIP, serverIP, subnetMask) {
  const [serverBase] = serverIP.split('.');
  const [clientBase] = clientIP.split('.');
  return serverBase === clientBase; // Simple check for /24 subnet
}

// Get server IP
function getServerIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback
}

const serverIP = getServerIP();

// Middleware to check access
app.use('/registration', (req, res, next) => {
  const clientIP = getClientIP(req);
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({ message: 'Access denied. IP not allowed.' });
  }
  if (!isInSameSubnet(clientIP, serverIP, process.env.ADMIN_WIFI_SUBNET)) {
    return res.status(403).json({ message: 'Access denied. Not connected to admin wifi.' });
  }
  next();
});

// Routes
app.post('/add-ip', (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ message: 'IP address required.' });
  }
  if (!allowedIPs.includes(ip)) {
    allowedIPs.push(ip);
  }
  res.json({ message: 'IP added successfully.', allowedIPs });
});

app.get('/allowed-ips', (req, res) => {
  res.json({ allowedIPs });
});

app.get('/check-access', (req, res) => {
  const clientIP = getClientIP(req);
  const hasAccess = allowedIPs.includes(clientIP);
  const onWifi = isInSameSubnet(clientIP, serverIP, process.env.ADMIN_WIFI_SUBNET);
  res.json({ clientIP, hasAccess, onWifi });
});

app.get('/registration', (req, res) => {
  res.json({ message: 'Welcome to registration page.' });
});

app.get('/dashboard', (req, res) => {
  const clientIP = getClientIP(req);
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  res.json({ message: 'Welcome to dashboard.' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server IP: ${serverIP}`);
});
