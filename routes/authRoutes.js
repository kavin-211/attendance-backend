const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Hardcoded custodian credentials
const CUSTODIAN_CREDENTIALS = {
    userId: '1234',
    password: '1234',
    username: 'Custodian',
    email: 'custodian@company.com',
    role: 'custodian',
    designation: 'System Custodian'
};

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Check custodian credentials first
        if (userId === CUSTODIAN_CREDENTIALS.userId && 
            password === CUSTODIAN_CREDENTIALS.password) {
            
            const token = jwt.sign(
                { 
                    userId: CUSTODIAN_CREDENTIALS.userId,
                    role: 'custodian',
                    username: CUSTODIAN_CREDENTIALS.username
                },
                process.env.JWT_SECRET || 'your_jwt_secret_key',
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

        // Check IP restriction for employees (only for registration page)
        if (user.role === 'employee' && user.ipAddresses.length > 0) {
            const isIpAllowed = user.ipAddresses.some(ip => 
                clientIp.includes(ip) || ip === '*'
            );
            
            if (!isIpAllowed) {
                return res.status(403).json({
                    success: false,
                    message: 'Access restricted to registered devices only'
                });
            }
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
            process.env.JWT_SECRET || 'your_jwt_secret_key',
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

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Check custodian
        if (userId === CUSTODIAN_CREDENTIALS.userId) {
            // In production, send email. For demo, return password
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

        // In production, implement email sending logic here
        // For demo, we'll return a message
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

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
        
        // Find user
        let user;
        if (decoded.role === 'custodian') {
            user = {
                userId: CUSTODIAN_CREDENTIALS.userId,
                username: CUSTODIAN_CREDENTIALS.username,
                email: CUSTODIAN_CREDENTIALS.email,
                role: 'custodian',
                designation: CUSTODIAN_CREDENTIALS.designation
            };
        } else {
            user = await User.findOne({ userId: decoded.userId, status: 'active' })
                .select('-password');
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

module.exports = router;