const User = require('../models/User');
const Friendship = require('../models/Friendship');
const bcrypt = require('bcryptjs');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const matchAll = require('match-all');
const { similarity } = require('../helpers/similarity');

const TweetResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

const RemoveTweetResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    NotYourPost: 3,
    Success: 4,
    Error: 5
}

const EditTweetResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    NotYourPost: 3,
    Success: 4,
    Error: 5
}

const AddLikeResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    AlreadyLiked: 3,
    Success: 4,
    Error: 5
}

const RemoveLikeResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    NotLiked: 3,
    Success: 4,
    Error: 5
}

const AddShareResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    AlreadyShared: 3,
    SelfShare: 4,
    Success: 5,
    Error: 6
}

const RemoveShareResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    NotShared: 3,
    Success: 4,
    Error: 5
}

const AddCommentResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    Success: 3,
    Error: 4
}

const RemoveCommentResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    CommentNotFound: 3,
    NotYourComment: 4,
    Success: 5,
    Error: 6
}

const EditCommentResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    CommentNotFound: 3,
    NotYourComment: 4,
    Success: 5,
    Error: 6
}

const GetFeedResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

const SearchTweetsResponseEnum = {
    Success: 1,
    Error: 2
}

const GetTweetResponseEnum = {
    UserNotFound: 1,
    PostNotFound: 2,
    Success: 3,
    Error: 4
}

const GetCommentsResponseEnum = {
    TweetNotFound: 1,
    Success: 2,
    Error: 3
}

const GetAccountTweetsResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

module.exports = {

    TweetResponseEnum,
    RemoveTweetResponseEnum,
    EditTweetResponseEnum,
    AddLikeResponseEnum,
    RemoveLikeResponseEnum,
    AddShareResponseEnum,
    RemoveShareResponseEnum,
    AddCommentResponseEnum,
    RemoveCommentResponseEnum,
    EditCommentResponseEnum,
    GetFeedResponseEnum,
    SearchTweetsResponseEnum,
    GetTweetResponseEnum,
    GetCommentsResponseEnum,
    GetAccountTweetsResponseEnum,

    async tweet(userId, tweet, mediapath) {
        try{
            const user = await User.findById(userId);
            if(!user) return TweetResponseEnum.UserNotFound;

            // Extract Hashtags
            const hashtagRegex = /#[a-zA-Z0-9]+/g;
            let hashtags = tweet.match(hashtagRegex) || [];
            hashtags = hashtags.map(el => el.slice(1).toLowerCase());
            console.log(`Hashtags:`);
            console.log(hashtags);

            // Extract Mentions
            const mentionRegex = /@[a-zA-Z0-9]+/g;
            let mentions = tweet.match(mentionRegex) || [];
            mentions = mentions.map(el => el.slice(1));
            console.log(`Mentions:`);
            console.log(mentions);

            const newTweet = new Post({
                userId: userId,
                content: tweet,
                mediapath: mediapath,
                hashtags: hashtags
            });
            newTweet.save();

            // Add Mentions to users in DB
            mentions.forEach(async mention => {
                const mentionedUser = await User.findOne({slug: mention});
                if(mentionedUser){
                    const newMention = {
                        mentioner: user,
                        tweetId: newTweet._id,
                        mentionedOn: Date.now(),
                        seen: false
                    };

                    mentionedUser.mentions = [newMention, ...mentionedUser.mentions];
                    mentionedUser.save();
                }
            });

            return TweetResponseEnum.Success;
        } catch(e) {
            console.error(e);
            return TweetResponseEnum.Error;
        }
    },

    async removeTweet(userId, postId) {
        try{
            const user = await User.findById(userId);
            const post = await Post.findById(postId);

            if(!user) return RemoveTweetResponseEnum.UserNotFound;
            if(!post) return RemoveTweetResponseEnum.PostNotFound;
            if(post.userId != userId) return RemoveTweetResponseEnum.NotYourPost;
            
            post.remove();

            return RemoveTweetResponseEnum.Success;
        } catch(e) {
            return RemoveTweetResponseEnum.Error;
        }
    },

    async editTweet(userId, postId, newContent, removeMedia, filepath) {
        try{
            const user = await User.findById(userId);
            const post = await Post.findById(postId);

            if(!user) return { status: EditTweetResponseEnum.UserNotFound };
            if(!post) return { status: EditTweetResponseEnum.PostNotFound };
            if(post.userId != userId) return { status: EditTweetResponseEnum.NotYourPost };

            // Extract Hashtags
            const hashtagRegex = /#[a-zA-Z0-9]+/g;
            let hashtags = newContent.match(hashtagRegex) || [];
            hashtags = hashtags.map(el => el.slice(1).toLowerCase());
            console.log(`Hashtags:`);
            console.log(hashtags);

            // Extract Mentions
            const mentionRegex = /@[a-zA-Z0-9]+/g;
            let mentions = newContent.match(mentionRegex) || [];
            mentions = mentions.map(el => el.slice(1));
            console.log(`Mentions:`);
            console.log(mentions);

            // Add Mentions to users in DB
            mentions.forEach(async mention => {
                const mentionedUser = await User.findOne({slug: mention});
                if(mentionedUser && mentionedUser.mentions && !mentionedUser.mentions.some(m => m.tweetId == postId)){
                    const newMention = {
                        mentioner: user,
                        tweetId: post._id,
                        mentionedOn: Date.now(),
                        seen: false
                    };

                    mentionedUser.mentions = [newMention, ...mentionedUser.mentions];
                    mentionedUser.save((err, doc) => {
                        if(err) return;
                    });
                }
            });
            
            post.content = newContent;
            post.hashtags = hashtags;
            if(filepath) post.mediapath = filepath;
            if(removeMedia) post.mediapath = null;
            post.save();

            return { status: EditTweetResponseEnum.Success, post };
        } catch(e) {
            console.error(e);
            return { status: EditTweetResponseEnum.Error };
        }
    },

    async addLike(userId, postId) {
        try{
            const user = await User.findById(userId);
            const post = await Post.findById(postId);

            if(!user) return AddLikeResponseEnum.UserNotFound;
            if(!post) return AddLikeResponseEnum.PostNotFound;
            if(post.likes.includes(userId)) return AddLikeResponseEnum.AlreadyLiked;
            
            post.likes.push(userId);
            post.save();

            return AddLikeResponseEnum.Success;
        } catch(e) {
            return AddLikeResponseEnum.Error;
        }
    },

    async removeLike(userId, postId) {
        try{
            const user = await User.findById(userId);
            const post = await Post.findById(postId);

            if(!user) return RemoveLikeResponseEnum.UserNotFound;
            if(!post) return RemoveLikeResponseEnum.PostNotFound;
            if(!post.likes.includes(userId)) return RemoveLikeResponseEnum.NotLiked;
            
            post.likes = post.likes.filter(like => like != userId);
            post.save();

            return RemoveLikeResponseEnum.Success;
        } catch(e) {
            return RemoveLikeResponseEnum.Error;
        }
    },

    async addShare(userId, postId) {
        try{
            const user = await User.findById(userId);
            const post = await Post.findById(postId);

            if(!user) return AddShareResponseEnum.UserNotFound;
            if(!post) return AddShareResponseEnum.PostNotFound;
            if(post.shares.includes(userId)) return AddShareResponseEnum.AlreadyShared;
            if(post.userId == userId) return AddShareResponseEnum.SelfShare;
            
            post.shares.push(userId);
            post.save();

            return AddShareResponseEnum.Success;
        } catch(e) {
            return AddShareResponseEnum.Error;
        }
    },

    async removeShare(userId, postId) {
        try{
            const user = await User.findById(userId);
            const post = await Post.findById(postId);

            if(!user) return RemoveShareResponseEnum.UserNotFound;
            if(!post) return RemoveShareResponseEnum.PostNotFound;
            if(!post.shares.includes(userId)) return RemoveShareResponseEnum.NotShared;
            
            post.shares = post.shares.filter(share => share != userId);
            post.save();

            return RemoveShareResponseEnum.Success;
        } catch(e) {
            return RemoveShareResponseEnum.Error;
        }
    },

    async addComment(userId, postId, comment) {
        try{
            const user = await User.findById(userId);
            const post = await Post.findById(postId);

            if(!user) return { status: AddCommentResponseEnum.UserNotFound };
            if(!post) return { status: AddCommentResponseEnum.PostNotFound };
            
            let newComment = new Comment({userId, comment});
            post.comments.push(newComment);
            post.save();

            return { status: AddCommentResponseEnum.Success, comment: newComment, poster: user };
        } catch(e) {
            return { status: AddCommentResponseEnum.Error, error: e };
        }
    },

    async removeComment(userId, postId, commentId) {
        try{
            const user = await User.findById(userId);
            const post = await Post.findById(postId);

            if(!user) return RemoveCommentResponseEnum.UserNotFound;
            if(!post) return RemoveCommentResponseEnum.PostNotFound;

            const comment = post.comments.filter(c => c._id == commentId)[0];
            if(!comment) return RemoveCommentResponseEnum.CommentNotFound;
            if(comment.userId != userId) return RemoveCommentResponseEnum.NotYourComment;
            
            post.comments = post.comments.filter(c => c._id != commentId);
            post.save();

            return RemoveCommentResponseEnum.Success;
        } catch(e) {
            return RemoveCommentResponseEnum.Error;
        }
    },

    async editComment(userId, postId, commentId, newComment) {
        try{
            const user = await User.findById(userId);
            const post = await Post.findById(postId);

            if(!user) return EditCommentResponseEnum.UserNotFound;
            if(!post) return EditCommentResponseEnum.PostNotFound;
            console.log(post);

            const comment = post.comments.filter(c => c._id == commentId)[0];
            if(!comment) return EditCommentResponseEnum.CommentNotFound;
            if(comment.userId != userId) return EditCommentResponseEnum.NotYourComment;
            
            post.comments = post.comments.map(c => {
                if(c._id == commentId){
                    c.comment = newComment;
                }
                return c;
            });
            post.markModified('comments');
            post.save();

            return EditCommentResponseEnum.Success;
        } catch(e) {
            return EditCommentResponseEnum.Error;
        }
    },

    async getFeed(userId, startIndex, amount){
        try{
            const user = await User.findById(userId).select("-mentions");
            if(!user) return { status: GetFeedResponseEnum.UserNotFound };

            // Get friends
            const friendships = await Friendship
                .find({ $or: [{user1Id: userId}, {user2Id: userId}]})
                .find({ isAccepted: true });
            const friendIds = friendships.map(f => f.user1Id == userId ? f.user2Id : f.user1Id);

            // Build feed
            let feed = [];
            const posts = [];
            for(const friendship of friendships) {
                const friendId = friendship.user1Id == userId ? friendship.user2Id : friendship.user1Id;
                const friend = await User.findById(friendId).select("-mentions");

                if(friend) {
                    const milli = (new Date().getMilliseconds()) - (1000*60*60*24*30);
                    const threeDaysAgo = new Date().setMilliseconds(milli);

                    const friendPosts = await Post
                        .find({ $or: [{ userId: friend._id}, { userId: { $nin: friendIds }, shares: friend._id }] })
                        .find({ createdOn: { $gte: threeDaysAgo } })
                        .sort({ createdOn: 'desc' });

                    for(const post of friendPosts){
                        if(post.userId == friend._id){
                            posts.push({
                                post,
                                poster: friend,
                                reposter: null
                            });
                        } else {
                            posts.push({
                                post,
                                poster: await User.findById(post.userId).select("-mentions"),
                                reposter: friend
                            });
                        }
                    }
                }
            };

            feed = posts
                .sort((p1, p2) => p2.post.createdOn - p1.post.createdOn)
                .slice(startIndex, startIndex + amount);

            return { status: GetFeedResponseEnum.Success, feed };
        } catch(e) {
            console.error(e.message);
            return { status: GetFeedResponseEnum.Error };
        }
    },

    async searchTweets(query){
        try{
            let keywords = query.toLowerCase().split(" ");
            const tweets = await Post
                .find({ hashtags: { $in: keywords } })
                .sort({createdOn: -1})
                .limit(50);

            // Build results
            let results = [];
            for(const tweet of tweets) {
                const poster = await User.findById(tweet.userId);

                if(poster){
                    results.push({
                        post: tweet,
                        poster
                    });
                }
            };

            return { status: SearchTweetsResponseEnum.Success, results };
        } catch(e) {
            console.error(e.message);
            return { status: SearchTweetsResponseEnum.Error };
        }
    },

    async getAccountTweets(userId, startIndex, amount){
        try{
            const user = await User.findById(userId).select("-mentions");
            if(!user) return { status: GetAccountTweetsResponseEnum.UserNotFound };

            // Build tweets
            let tweets = [];
            const posts = await Post
                .find({ $or: [{ userId: userId}, { shares: userId }] })
                .sort({ createdOn: 'desc' })
                .skip(startIndex)
                .limit(amount);

            for(let post of posts){
                if(post.userId == userId){
                    tweets.push({
                        post,
                        poster: user,
                        reposter: null
                    });
                } else {
                    tweets.push({
                        post,
                        poster: await User.findById(post.userId).select("-mentions"),
                        reposter: user
                    });
                }
            }

            return { status: GetAccountTweetsResponseEnum.Success, tweets };
        } catch(e) {
            console.error(e.message);
            return { status: GetAccountTweetsResponseEnum.Error };
        }
    },

    async getTweet(tweetId){
        try{
            const tweet = await Post.findById(tweetId);
            if(!tweet) return { status: GetTweetResponseEnum.PostNotFound };
            console.log(tweet);

            const poster = await User.findById(tweet.userId);
            if(!poster) return { status: GetTweetResponseEnum.UserNotFound };

            return { status: GetTweetResponseEnum.Success, tweet, poster };
        } catch(e) {
            console.error(e.message);
            return { status: GetTweetResponseEnum.Error };
        }
    },

    async getComments(postId){
        try{
            const post = await Post.findById(postId);
            if(!post) return { status: GetCommentsResponseEnum.TweetNotFound };

            // Get comments
            const comments = post.comments.sort((c1, c2) => c2.createdOn - c1.createdOn);

            // Get users of comments
            for(const comment of comments) {
                const poster = await User.findById(comment.userId).select("-mentions");

                if(poster) {
                    comment.poster = poster;
                }
            };

            return { status: GetCommentsResponseEnum.Success, comments };
        } catch(e) {
            console.error(e.message);
            return { status: GetCommentsResponseEnum.Error };
        }
    }
}