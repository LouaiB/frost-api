const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: null
    },
    slug: {
        type: String,
        required: true
    },
    nickname: {
        type: String,
        default: null
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    roles: {
        type: [],
        required: true,
        default: []
    },
    mentions: {
        type: [],
        default: []
    }
});

const User = mongoose.model('User', UserSchema);
module.exports = User;