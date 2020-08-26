const mongoose = require('mongoose');

const FriendshipSchema = new mongoose.Schema({
    user1Id: {
        type: String,
        required: true
    },
    user2Id: {
        type: String,
        required: true
    },
    isPending: {
        type: Boolean,
        default: true
    },
    isAccepted: {
        type: Boolean,
        default: false
    },
    isDeclined: {
        type: Boolean,
        default: false
    },
    createdOn: {
        type: Date,
        default: Date.now
    }
});

const Friendship = mongoose.model('Friendship', FriendshipSchema);
module.exports = Friendship;