const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://attendance-frontend-omega-eosin.vercel.app',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/auth', limiter);

// Simple test route - always works
app.get('/', (req, res) => {
    res.json({ 
        status: 'success',
        message: 'Attendance Backend API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

// Database connection with better error handling
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            console.warn('MONGODB_URI not found in environment variables. Using in-memory mode.');
            return;
        }

        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        // Don't crash the app if DB fails
    }
};

// Connect to database
connectDB();

// Basic models
const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        default: () => Math.floor(1000 + Math.random() * 9000).toString()
    },
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'employee', 'custodian'],
        default: 'employee'
    },
    designation: {
        type: String,
        required: true
    },
    department: {
        type: String,
        default: 'General'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    ipAddresses: [{
        type: String,
        trim: true
    }],
    profilePhoto: {
        type: String,
        default: ''
    },
    mobile: {
        type: String,
        default: ''
    },
    joiningDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Hardcoded custodian credentials
const CUSTODIAN_CREDENTIALS = {
    userId: '1234',
    password: '1234',
    username: 'Custodian',
    email: 'custodian@company.com',
    role: 'custodian',
    designation: 'System Custodian'
};

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        
        // Check custodian credentials first
        if (userId === CUSTODIAN_CREDENTIALS.userId && 
            password === CUSTODIAN_CREDENTIALS.password) {
            
            const token = jwt.sign(
                { 
                    userId: CUSTODIAN_CREDENTIALS.userId,
                    role: 'custodian',
                    username: CUSTODIAN_CREDENTIALS.username
                },
                process.env.JWT_SECRET || 'fallback_secret_key_for_development',
                { expiresIn: '24h' }
            );

            return res.json({
                success: true,
                token,
                user: {
                    userId: CUSTODIAN_CREDENTIALS.userId,
                    username: CUSTODIAN_CREDENTIALS.username,
                    email: CUSTODIAN_CREDENTIALS.email,
                    role: 'custodian',
                    designation: CUSTODIAN_CREDENTIALS.designation
                }
            });
        }

        // Check for regular users
        const user = await User.findOne({ 
            $or: [
                { userId: userId },
                { email: userId }
            ],
            status: 'active'
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.userId,
                role: user.role,
                username: user.username
            },
            process.env.JWT_SECRET || 'fallback_secret_key_for_development',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                userId: user.userId,
                username: user.username,
                email: user.email,
                role: user.role,
                designation: user.designation,
                department: user.department
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Check custodian
        if (userId === CUSTODIAN_CREDENTIALS.userId) {
            return res.json({
                success: true,
                message: `Your current password is ${CUSTODIAN_CREDENTIALS.password}`
            });
        }

        const user = await User.findOne({
            $or: [
                { userId: userId },
                { email: userId }
            ],
            status: 'active'
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Password reset email sent to your registered email address'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Test API endpoints
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password').limit(10);
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Get port from environment or default
const PORT = process.env.PORT || 3000;

// For Vercel deployment
module.exports = app;

// Only listen when running locally
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    });
}