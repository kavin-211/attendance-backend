const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'half-day', 'holiday', 'wfh'],
        default: 'present'
    },
    shiftType: {
        type: String,
        enum: ['full-day', 'first-half', 'second-half', 'overtime'],
        default: 'full-day'
    },
    workedHours: {
        type: Number,
        default: 0
    },
    lossOfPay: {
        type: Number,
        default: 0
    },
    lateMinutes: {
        type: Number,
        default: 0
    },
    earlyCheckoutMinutes: {
        type: Number,
        default: 0
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editReason: {
        type: String
    },
    editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deviceIp: {
        type: String
    },
    location: {
        type: String
    }
}, {
    timestamps: true
});

// Create index for faster queries
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);