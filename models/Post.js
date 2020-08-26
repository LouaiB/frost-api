const mongoose = require('mongoose');
const Comment = require('./Comment');

const PostSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    mediapath: {
        type: String,
        default: null
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    likes: {
        type: [],
        required: true,
        default: []
    },
    shares: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'shares'
        }],
        default: []
    },
    comments: {
        type: [],
        required: true,
        default: []
    },
    hashtags: {
        type: [],
        default: []
    }
});

const Post = mongoose.model('Post', PostSchema);
module.exports = Post;