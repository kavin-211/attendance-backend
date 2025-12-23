const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: "✅ Node.js Backend is Running Successfully!",
        status: "active",
        timestamp: new Date().toISOString(),
        instructions: "Send a POST request to /confirm for confirmation message"
    });
});

// Confirmation endpoint (GET method)
app.get('/confirm', (req, res) => {
    const confirmationMessage = {
        status: "success",
        message: "🎉 Confirmation Received Successfully!",
        data: {
            server: "Node.js Backend",
            time: new Date().toLocaleString('ta-IN'),
            language: "Tamil/English",
            action: "Deployment Successful"
        },
        instructions: {
            tamil: "வணக்கம்! உங்கள் Node.js பேகெண்ட் வெற்றிகரமாக இயங்குகிறது.",
            english: "Hello! Your Node.js backend is running successfully."
        }
    };
    
    res.json(confirmationMessage);
});

// Confirmation endpoint (POST method)
app.post('/confirm', (req, res) => {
    const userData = req.body || {};
    
    const confirmationMessage = {
        status: "success",
        message: "✅ POST Request Confirmed!",
        receivedData: userData,
        serverResponse: {
            timestamp: new Date().toISOString(),
            serverId: "node-backend-001",
            version: "1.0.0"
        },
        greeting: "நன்றி! உங்கள் தகவல் பெறப்பட்டது."
    };
    
    res.json(confirmationMessage);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Local: http://localhost:${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
    console.log(`📨 Confirmation: http://localhost:${PORT}/confirm`);
});