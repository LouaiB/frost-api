const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../helpers/crypt');
const UserManager = require('../managers/user.manager');
const PostManager = require('../managers/post.manager');
const { ensureAuthenticated, ensureHasRoles } = require('../config/auth');
const multer = require('multer');
const path = require('path');

const tweetUpload = multer({
    storage: multer.diskStorage({
        // Setting directory on disk to save uploaded files
        destination: function (req, file, cb) {
            cb(null, 'uploads/tweet-media')
        },
    
        // Setting name of file saved
        filename: function (req, file, cb) {
            cb(null, file.fieldname + '-' + Date.now() + '-' + req.userId + path.extname(file.originalname))
        }
    }),
    limits: {
        // Setting Image Size Limit to 5MBs
        fileSize: 5000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            //Error 
            cb(new Error('Please upload JPG and PNG images only!'))
        }
        //Success 
        cb(undefined, true)
    }
})

router.post('/tweet', ensureAuthenticated, async (req, res) => {
    tweetUpload.single("attachment")(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: err.message });
        } else if (err) {
          // An unknown error occurred when uploading.
          return res.status(500).json({ message: err.message });
        }
    
        // Everything went fine.
        const { tweet } = req.body;
        const file = req.file;
        let filepath = file ? 'tweet-media/' + file.filename : null;
        let errors = [];
    
        // TODO: Validation
        if(!tweet){
            errors.push('All fields required.');
        }
    
        if(errors.length > 0){
            return res.status(400).json({ message: 'One or more validation errors occured.', errors });
        } else {
            switch(await PostManager.tweet(req.userId, tweet, filepath)){
                case PostManager.TweetResponseEnum.UserNotFound:
                    return res.status(404).json({ message: 'User not found.'});
                    break;
                case PostManager.TweetResponseEnum.Success:
                    return res.json({ message: 'Tweeted successfully.'});
                    break;
                case PostManager.TweetResponseEnum.Error:
                    return res.status(500).json({ message: 'Error sending tweet.'});
                    break;
                default:
                    return res.json({ message: 'Default response.'});
            }
        }
    })

});

router.post('/removeTweet', ensureAuthenticated, async (req, res) => {
    const { postId } = req.body;
    let errors = [];

    // TODO: Validation
    if(!postId){
        errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await PostManager.removeTweet(req.userId, postId)){
            case PostManager.RemoveTweetResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.RemoveTweetResponseEnum.PostNotFound:
                res.status(404).json({ message: 'Tweet not found.'});
                break;
            case PostManager.RemoveTweetResponseEnum.NotYourPost:
                res.status(401).json({ message: 'You are unauthorized to remove this tweet.'});
                break;
            case PostManager.RemoveTweetResponseEnum.Success:
                res.json({ message: 'Removed tweet successfully.' });
                break;
            case PostManager.RemoveTweetResponseEnum.Error:
                res.status(500).json({ message: 'Error removing tweet.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/editTweet', ensureAuthenticated, async (req, res) => {
    tweetUpload.single("newAttachment")(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: err.message });
        } else if (err) {
          // An unknown error occurred when uploading.
          return res.status(500).json({ message: err.message });
        }
    
        // Everything went fine.
        const { postId, newContent, removeMedia } = req.body;
        const file = req.file;
        let filepath = file ? 'tweet-media/' + file.filename : null;
        let errors = [];

        // TODO: Validation
        if(!postId) errors.push('PostId required.');
        if(!newContent) errors.push('New content required.');
        const removeMediaBool = removeMedia == 'remove' ? true : false;

        if(errors.length > 0){
            return res.status(400).json({ message: 'One or more validation errors occured.', errors });
        } else {
            console.log(postId);
            console.log(newContent);
            console.log(removeMediaBool);
            const result = await PostManager.editTweet(req.userId, postId, newContent, removeMediaBool, filepath);

            switch(result.status){
                case PostManager.EditTweetResponseEnum.UserNotFound:
                    return res.status(404).json({ message: 'User not found.'});
                    break;
                case PostManager.EditTweetResponseEnum.PostNotFound:
                    return res.status(404).json({ message: 'Tweet not found.'});
                    break;
                case PostManager.EditTweetResponseEnum.NotYourTweet:
                    return res.status(401).json({ message: 'You are unauthorized to edit this tweet.'});
                    break;
                case PostManager.EditTweetResponseEnum.Success:
                    return res.json({ message: 'Edited tweet successfully.', post: result.post });
                    break;
                case PostManager.EditTweetResponseEnum.Error:
                    return res.status(500).json({ message: 'Error editing tweet.'});
                    break;
                default:
                    return res.json({ message: 'Default response.'});
            }
        }
    });
});

router.post('/addLike', ensureAuthenticated, async (req, res) => {
    console.log("ADD LIKE");
    const { postId } = req.body;
    let errors = [];

    // TODO: Validation
    if(!postId){
        errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await PostManager.addLike(req.userId, postId)){
            case PostManager.AddLikeResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.AddLikeResponseEnum.PostNotFound:
                res.status(404).json({ message: 'Tweet not found.'});
                break;
            case PostManager.AddLikeResponseEnum.AlreadyLiked:
                res.status(400).json({ message: 'Tweet already liked.'});
                break;
            case PostManager.AddLikeResponseEnum.Success:
                res.json({ message: 'Liked successfully.'});
                break;
            case PostManager.AddLikeResponseEnum.Error:
                res.status(500).json({ message: 'Error liking tweet.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/removeLike', ensureAuthenticated, async (req, res) => {
    const { postId } = req.body;
    let errors = [];

    // TODO: Validation
    if(!postId){
        errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await PostManager.removeLike(req.userId, postId)){
            case PostManager.RemoveLikeResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.RemoveLikeResponseEnum.PostNotFound:
                res.status(404).json({ message: 'Tweet not found.'});
                break;
            case PostManager.RemoveLikeResponseEnum.NotLiked:
                res.status(400).json({ message: 'Tweet not liked.'});
                break;
            case PostManager.RemoveLikeResponseEnum.Success:
                res.json({ message: 'Unliked successfully.'});
                break;
            case PostManager.RemoveLikeResponseEnum.Error:
                res.status(500).json({ message: 'Error unliking tweet.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/addShare', ensureAuthenticated, async (req, res) => {
    console.log("ADD SHARE");
    const { postId } = req.body;
    let errors = [];

    // TODO: Validation
    if(!postId){
        errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await PostManager.addShare(req.userId, postId)){
            case PostManager.AddShareResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.AddShareResponseEnum.PostNotFound:
                res.status(404).json({ message: 'Tweet not found.'});
                break;
            case PostManager.AddShareResponseEnum.AlreadyShared:
                res.status(400).json({ message: 'Tweet already shared.'});
                break;
            case PostManager.AddShareResponseEnum.SelfShare:
                res.status(400).json({ message: 'You cannot share your own tweet.'});
                break;
            case PostManager.AddShareResponseEnum.Success:
                res.json({ message: 'Shared successfully.'});
                break;
            case PostManager.AddShareResponseEnum.Error:
                res.status(500).json({ message: 'Error sharing tweet.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/removeShare', ensureAuthenticated, async (req, res) => {
    const { postId } = req.body;
    let errors = [];

    // TODO: Validation
    if(!postId){
        errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await PostManager.removeShare(req.userId, postId)){
            case PostManager.RemoveShareResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.RemoveShareResponseEnum.PostNotFound:
                res.status(404).json({ message: 'Tweet not found.'});
                break;
            case PostManager.RemoveShareResponseEnum.NotShared:
                res.status(400).json({ message: 'Tweet not shared.'});
                break;
            case PostManager.RemoveShareResponseEnum.Success:
                res.json({ message: 'Unshared successfully.'});
                break;
            case PostManager.RemoveShareResponseEnum.Error:
                res.status(500).json({ message: 'Error unsharing tweet.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/addComment', ensureAuthenticated, async (req, res) => {
    const { postId, comment } = req.body;
    let errors = [];

    // TODO: Validation
    if(!postId) errors.push('postId required');
    if(!comment) errors.push('comment required');

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        const result = await PostManager.addComment(req.userId, postId, comment);
        switch(result.status){
            case PostManager.AddCommentResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.AddCommentResponseEnum.PostNotFound:
                res.status(404).json({ message: 'Tweet not found.'});
                break;
            case PostManager.AddCommentResponseEnum.Success:
                res.json({ message: 'Added comment successfully.', comment: result.comment, poster: result.poster });
                break;
            case PostManager.AddCommentResponseEnum.Error:
                res.status(500).json({ message: 'Error adding comment.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/removeComment', ensureAuthenticated, async (req, res) => {
    const { postId, commentId } = req.body;
    let errors = [];

    // TODO: Validation
    if(!postId || !commentId){
        errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await PostManager.removeComment(req.userId, postId, commentId)){
            case PostManager.RemoveCommentResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.RemoveCommentResponseEnum.PostNotFound:
                res.status(404).json({ message: 'Tweet not found.'});
                break;
            case PostManager.RemoveCommentResponseEnum.CommentNotFound:
                res.status(404).json({ message: 'Comment not found.'});
                break;
            case PostManager.RemoveCommentResponseEnum.NotYourComment:
                res.status(401).json({ message: 'You are unauthorized to remove this comment.'});
                break;
            case PostManager.RemoveCommentResponseEnum.Success:
                res.json({ message: 'Removed comment successfully.' });
                break;
            case PostManager.RemoveCommentResponseEnum.Error:
                res.status(500).json({ message: 'Error removing comment.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/editComment', ensureAuthenticated, async (req, res) => {
    const { postId, commentId, newComment } = req.body;
    let errors = [];

    // TODO: Validation
    if(!postId) errors.push('PostId required.');
    if(!commentId) errors.push('CommentId required.');
    if(!newComment) errors.push('New comment required.');

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        console.log(`comment edit: ${newComment}`)
        switch(await PostManager.editComment(req.userId, postId, commentId, newComment)){
            case PostManager.EditCommentResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.EditCommentResponseEnum.PostNotFound:
                res.status(404).json({ message: 'Tweet not found.'});
                break;
            case PostManager.EditCommentResponseEnum.CommentNotFound:
                res.status(404).json({ message: 'Comment not found.'});
                break;
            case PostManager.EditCommentResponseEnum.NotYourComment:
                res.status(401).json({ message: 'You are unauthorized to edit this comment.'});
                break;
            case PostManager.EditCommentResponseEnum.Success:
                res.json({ message: 'Edited comment successfully.' });
                break;
            case PostManager.EditCommentResponseEnum.Error:
                res.status(500).json({ message: 'Error editing comment.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/feed', ensureAuthenticated, async (req, res) => {
    const { startIndex, amount } = req.body;
    let errors = [];

    // TODO: Validation
    if(!startIndex || !amount){
        //errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        const feed = await PostManager.getFeed(req.userId, startIndex, amount);
        switch(feed.status){
            case PostManager.GetFeedResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.GetFeedResponseEnum.Success:
                res.json(feed.feed);
                break;
            case PostManager.GetFeedResponseEnum.Error:
                res.status(500).json({ message: 'Error getting feed.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/searchTweets', ensureAuthenticated, async (req, res) => {
    const { query } = req.body;
    let errors = [];

    // TODO: Validation
    if(!query){
        errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        const result = await PostManager.searchTweets(query);
        switch(result.status){
            case PostManager.SearchTweetsResponseEnum.Success:
                res.json(result.results);
                break;
            case PostManager.SearchTweetsResponseEnum.Error:
                res.status(500).json({ message: 'Error searching tweets.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.post('/accountTweets', ensureAuthenticated, async (req, res) => {
    const { accountId, startIndex, amount } = req.body;
    let errors = [];

    // TODO: Validation
    if(!accountId || !startIndex || !amount){
        //errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        const tweets = await PostManager.getAccountTweets(accountId, startIndex, amount);
        switch(tweets.status){
            case PostManager.GetAccountTweetsResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.'});
                break;
            case PostManager.GetAccountTweetsResponseEnum.Success:
                res.json(tweets.tweets);
                break;
            case PostManager.GetAccountTweetsResponseEnum.Error:
                res.status(500).json({ message: 'Error getting feed.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

router.get('/getTweet/:id', ensureAuthenticated, async (req, res) => {
    const tweetId = req.params.id;

    const result = await PostManager.getTweet(tweetId);
    switch(result.status){
        case PostManager.GetTweetResponseEnum.UserNotFound:
            res.status(404).json({ status: result.status, message: 'Poster not found.'});
            break;
        case PostManager.GetTweetResponseEnum.PostNotFound:
            res.status(404).json({ status: result.status, message: 'Tweet not found.'});
            break;
        case PostManager.GetTweetResponseEnum.Success:
            console.log(result);
            res.json(result);
            break;
        case PostManager.GetTweetResponseEnum.Error:
            res.status(500).json({ message: 'Error getting tweet.'});
            break;
        default:
            res.json({ message: 'Default response.'});
    }
});

router.post('/comments', ensureAuthenticated, async (req, res) => {
    console.log('GET COMMENTS');
    const { postId } = req.body;
    let errors = [];

    // TODO: Validation
    if(!postId){
        errors.push('All fields required.');
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        const comments = await PostManager.getComments(postId);
        switch(comments.status){
            case PostManager.GetCommentsResponseEnum.TweetNotFound:
                res.status(404).json({ message: 'Tweet not found.'});
                break;
            case PostManager.GetCommentsResponseEnum.Success:
                res.json(comments.comments);
                break;
            case PostManager.GetCommentsResponseEnum.Error:
                res.status(500).json({ message: 'Error getting comments.'});
                break;
            default:
                res.json({ message: 'Default response.'});
        }
    }
});

module.exports = router;
