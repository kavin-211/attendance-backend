const User = require('../models/User');

const ipCheck = async (req, res, next) => {
    try {
        const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const user = req.user;

        // Admin and custodian can access from anywhere
        if (user.role === 'admin' || user.role === 'custodian') {
            return next();
        }

        // For employees, check IP restriction
        if (user.role === 'employee') {
            const employee = await User.findById(user.id);
            
            if (employee && employee.ipAddresses && employee.ipAddresses.length > 0) {
                const isIpAllowed = employee.ipAddresses.some(ip => 
                    clientIp.includes(ip) || ip === '*'
                );
                
                if (!isIpAllowed) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. Please connect from registered devices only.'
                    });
                }
            }
        }

        next();
    } catch (error) {
        console.error('IP check error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during IP validation'
        });
    }
};

module.exports = ipCheck;