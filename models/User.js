const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

module.exports = mongoose.model('User', userSchema);