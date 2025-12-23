const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Attendance = require('../models/Attendance');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'custodian') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
};

// Get dashboard statistics
router.get('/dashboard/stats', auth, isAdmin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Total employees
        const totalEmployees = await User.countDocuments({ role: 'employee', status: 'active' });

        // Today's attendance stats
        const todayAttendance = await Attendance.aggregate([
            {
                $match: {
                    date: {
                        $gte: today,
                        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                    }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Convert to object
        const stats = {
            present: 0,
            absent: 0,
            late: 0
        };

        todayAttendance.forEach(item => {
            if (item._id === 'present') stats.present = item.count;
            if (item._id === 'absent') stats.absent = item.count;
            if (item._id === 'late') stats.late = item.count;
        });

        // Calculate absent (total employees - present)
        const absentCount = totalEmployees - stats.present - stats.late;

        res.json({
            success: true,
            data: {
                totalEmployees,
                present: stats.present,
                absent: absentCount > 0 ? absentCount : 0,
                late: stats.late
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics'
        });
    }
});

// Get employees list
router.get('/employees', auth, isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const query = {
            role: 'employee',
            ...(search && {
                $or: [
                    { username: { $regex: search, $options: 'i' } },
                    { userId: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { designation: { $regex: search, $options: 'i' } }
                ]
            })
        };

        const employees = await User.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: employees,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employees'
        });
    }
});

// Add new employee
router.post('/employees', auth, isAdmin, async (req, res) => {
    try {
        const {
            username,
            email,
            mobile,
            designation,
            department,
            ipAddresses,
            password
        } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Generate unique 4-digit ID
        let uniqueId;
        let isUnique = false;
        
        while (!isUnique) {
            uniqueId = Math.floor(1000 + Math.random() * 9000).toString();
            const existingId = await User.findOne({ userId: uniqueId });
            if (!existingId) isUnique = true;
        }

        const newEmployee = new User({
            userId: uniqueId,
            username,
            email,
            mobile,
            designation,
            department,
            ipAddresses: ipAddresses || [],
            password: password || 'default123', // In production, generate random password
            role: 'employee',
            status: 'active',
            createdBy: req.user._id
        });

        await newEmployee.save();

        res.status(201).json({
            success: true,
            message: 'Employee added successfully',
            data: {
                userId: newEmployee.userId,
                username: newEmployee.username,
                email: newEmployee.email,
                designation: newEmployee.designation
            }
        });

    } catch (error) {
        console.error('Add employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding employee'
        });
    }
});

// Update employee
router.put('/employees/:id', auth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Don't allow updating userId
        if (updateData.userId) {
            delete updateData.userId;
        }

        const employee = await User.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            message: 'Employee updated successfully',
            data: employee
        });

    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating employee'
        });
    }
});

// Delete employee
router.delete('/employees/:id', auth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete - mark as inactive
        const employee = await User.findByIdAndUpdate(
            id,
            { status: 'inactive' },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            message: 'Employee deactivated successfully'
        });

    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deactivating employee'
        });
    }
});

// Get employee attendance
router.get('/employees/:id/attendance', auth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { month, year } = req.query;
        
        const startDate = new Date(year || new Date().getFullYear(), 
                                  month ? month - 1 : new Date().getMonth(), 1);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

        const attendance = await Attendance.find({
            employeeId: id,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });

        // Calculate totals
        const totals = attendance.reduce((acc, record) => {
            acc.totalHours += record.workedHours || 0;
            acc.lateCount += record.status === 'late' ? 1 : 0;
            acc.lossOfPay += record.lossOfPay || 0;
            return acc;
        }, { totalHours: 0, lateCount: 0, lossOfPay: 0 });

        res.json({
            success: true,
            data: attendance,
            totals
        });

    } catch (error) {
        console.error('Get employee attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attendance'
        });
    }
});

module.exports = router;