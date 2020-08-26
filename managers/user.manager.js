const User = require('../models/User');
const Post = require('../models/Post');
const Friendship = require('../models/Friendship');
const bcrypt = require('bcryptjs');
const { isValidObjectId, Types } = require('mongoose');

const ChangePasswordResponseEnum = {
    UserNotFound: 1,
    InvalidOldPassword: 2,
    Success: 3
}

const AddRoleResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

const RemoveRoleResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

const SendFriendRequestResponseEnum = {
    UserNotFound: 1,
    User2NotFound: 2,
    RequestAlreadySent: 3,
    Success: 4,
    Error: 5
}

const AcceptFriendRequestResponseEnum = {
    UserNotFound: 1,
    RequestNotFound: 2,
    UserNotMatched: 3,
    Success: 4,
    Error: 5
}

const DeclineFriendRequestResponseEnum = {
    UserNotFound: 1,
    RequestNotFound: 2,
    UserNotMatched: 3,
    Success: 4,
    Error: 5
}

const UndeclineFriendRequestResponseEnum = {
    UserNotFound: 1,
    RequestNotFound: 2,
    UserNotMatched: 3,
    Success: 4,
    Error: 5
}

const CancelFriendRequestResponseEnum = {
    UserNotFound: 1,
    RequestNotFound: 2,
    UserNotMatched: 3,
    Success: 4,
    Error: 5
}

const UnfriendResponseEnum = {
    UserNotFound: 1,
    RequestNotFound: 2,
    UserNotMatched: 3,
    Success: 4,
    Error: 5
}

const GetFriendsResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

const GetFriendshipsResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

const GetAccountResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

const ChangeAvatarResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

const ChangeNicknameResponseEnum = {
    UserNotFound: 1,
    Success: 2,
    Error: 3
}

const SearchUsersResponseEnum = {
    Success: 1,
    Error: 2
}

const SetSeenResponseEnum = {
    Success: 1,
    Error: 2
}

module.exports = {

    ChangePasswordResponseEnum,
    AddRoleResponseEnum,
    RemoveRoleResponseEnum,
    SendFriendRequestResponseEnum,
    AcceptFriendRequestResponseEnum,
    DeclineFriendRequestResponseEnum,
    UndeclineFriendRequestResponseEnum,
    CancelFriendRequestResponseEnum,
    UnfriendResponseEnum,
    GetFriendsResponseEnum,
    GetFriendshipsResponseEnum,
    GetAccountResponseEnum,
    ChangeAvatarResponseEnum,
    ChangeNicknameResponseEnum,
    SearchUsersResponseEnum,
    SetSeenResponseEnum,

    async changePassword(userId, oldPassword, newPassword) {
        try{
            const user = await User.findById(userId);
            if(!user){
                return ChangePasswordResponseEnum.UserNotFound;
            } else if(!bcrypt.compareSync(oldPassword, user.password)) {
                return ChangePasswordResponseEnum.InvalidOldPassword;
            } else {
                const newPasswordHashed = bcrypt.hashSync(newPassword, 10);
                user.password = newPasswordHashed;
                user.save();
                return ChangePasswordResponseEnum.Success;
            }
        } catch(e) {
            return ChangePasswordResponseEnum.Error;
        }
    },

    async addRole(userId, newRole) {
        try{
            const user = await User.findById(userId);
            if(!user){
                return AddRoleResponseEnum.UserNotFound;
            } else {
                if(!user.roles.includes(newRole))
                    user.roles.push(newRole);
                user.save();
                return AddRoleResponseEnum.Success;
            }
        } catch(e) {
            return AddRoleResponseEnum.Error;
        }
    },

    async removeRole(userId, oldRole) {
        try{
            const user = await User.findById(userId);
            if(!user){
                return RemoveRoleResponseEnum.UserNotFound;
            } else {
                user.roles = user.roles.filter(role => role != oldRole);
                user.save();
                return RemoveRoleResponseEnum.Success;
            }
        } catch(e) {
            return RemoveRoleResponseEnum.Error;
        }
    },

    async sendFriendRequest(userId, user2Id) {
        try{
            const user1 = await User.findById(userId);
            const user2 = await User.findById(user2Id);

            if(!user1) return { status: SendFriendRequestResponseEnum.UserNotFound };
            if(!user2) return { status: SendFriendRequestResponseEnum.User2NotFound };

            const friendship = await Friendship.find({user1Id: userId, user2Id: user2Id});
            if(friendship.length > 0){
                return { status: SendFriendRequestResponseEnum.RequestAlreadySent };
            } else {          
                const newFriendship = new Friendship({
                    user1Id: userId,
                    user2Id: user2Id
                });
                newFriendship.save();

                return { status: SendFriendRequestResponseEnum.Success, newFriendship };
            }
        } catch(e) {
            console.error(e.message);
            return { status: SendFriendRequestResponseEnum.Error };
        }
    },

    async acceptFriendRequest(userId, requestId) {
        try{
            const user = await User.findById(userId);
            const request = await Friendship.findById(requestId);

            if(!user) return AcceptFriendRequestResponseEnum.UserNotFound;
            if(!request) return AcceptFriendRequestResponseEnum.RequestNotFound;
            if(userId != request.user2Id) return AcceptFriendRequestResponseEnum.UserNotMatched;

            request.isPending = false;
            request.isAccepted = true;
            request.save();

            return AcceptFriendRequestResponseEnum.Success;
        } catch(e) {
            return AcceptFriendRequestResponseEnum.Error;
        }
    },

    async declineFriendRequest(userId, requestId) {
        try{
            const user = await User.findById(userId);
            const request = await Friendship.findById(requestId);

            if(!user) return DeclineFriendRequestResponseEnum.UserNotFound;
            if(!request) return DeclineFriendRequestResponseEnum.RequestNotFound;
            if(userId != request.user2Id) return DeclineFriendRequestResponseEnum.UserNotMatched;

            request.isPending = false;
            request.isDeclined = true;
            request.save();
            
            return DeclineFriendRequestResponseEnum.Success;
        } catch(e) {
            return DeclineFriendRequestResponseEnum.Error;
        }
    },

    async undeclineFriendRequest(userId, requestId) {
        try{
            const user = await User.findById(userId);
            const request = await Friendship.findById(requestId);

            if(!user) return DeclineFriendRequestResponseEnum.UserNotFound;
            if(!request) return DeclineFriendRequestResponseEnum.RequestNotFound;
            if(userId != request.user2Id) return DeclineFriendRequestResponseEnum.UserNotMatched;

            request.isPending = true;
            request.isDeclined = false;
            request.save();
            
            return DeclineFriendRequestResponseEnum.Success;
        } catch(e) {
            return DeclineFriendRequestResponseEnum.Error;
        }
    },

    async cancelFriendRequest(userId, requestId) {
        try{
            const user = await User.findById(userId);
            const request = await Friendship.findById(requestId);

            if(!user) return CancelFriendRequestResponseEnum.UserNotFound;
            if(!request) return CancelFriendRequestResponseEnum.RequestNotFound;
            if(userId != request.user1Id) return CancelFriendRequestResponseEnum.UserNotMatched;

            request.remove();
            
            return CancelFriendRequestResponseEnum.Success;
        } catch(e) {
            return CancelFriendRequestResponseEnum.Error;
        }
    },

    async unfriend(userId, requestId) {
        try{
            const user = await User.findById(userId);
            const request = await Friendship.findById(requestId);

            if(!user) return UnfriendResponseEnum.UserNotFound;
            if(!request) return UnfriendResponseEnum.RequestNotFound;
            if(userId != request.user1Id && userId != request.user2Id) return UnfriendResponseEnum.UserNotMatched;

            request.remove();

            return UnfriendResponseEnum.Success;
        } catch(e) {
            return UnfriendResponseEnum.Error;
        }
    },

    async getFriends(userId) {
        try{
            const user = await User.findById(userId);
            if(!user) return { status: GetFriendsResponseEnum.UserNotFound };

            const friendships = await Friendship.find({ $or: [{user1Id: userId}, {user2Id: userId}], isAccepted: true });

            const friends = [];
            for(const friendship of friendships) {
                const friendId = friendship.user1Id == userId ? friendship.user2Id : friendship.user1Id;
                const friend = await User.findById(friendId);
                if(friend) friends.push({ friend, friendship });
            }
            
            return { status: GetFriendsResponseEnum.Success, friends };
        } catch(e) {
            return { status: DeclineFriendRequestResponseEnum.Error };
        }
    },

    async getFriendships(userId) {
        try{
            const user = await User.findById(userId);
            if(!user) return { status: GetFriendshipsResponseEnum.UserNotFound };

            const friendships = await Friendship.find({ $or: [{user1Id: userId}, {user2Id: userId}] });

            const friends = [];
            for(const friendship of friendships) {
                const friendId = friendship.user1Id == userId ? friendship.user2Id : friendship.user1Id;
                const friend = await User.findById(friendId);
                if(friend) friends.push({ friend, friendship });
            }
            
            return { status: GetFriendshipsResponseEnum.Success, friends };
        } catch(e) {
            return { status: GetFriendshipsResponseEnum.Error };
        }
    },

    async searchUsers(query) {
        try{
            const regex = new RegExp(`${query}`, 'i');
            console.log(regex);
            const users = await User.find({ $or: [{nickname: {$regex: regex}}, {email: {$regex: regex}}] });
            
            return { status: SearchUsersResponseEnum.Success, users };
        } catch(e) {
            return { status: SearchUsersResponseEnum.Error };
        }
    },

    async getAccount(specifier, userId) {
        try{
            let query = {};
            if(isValidObjectId(specifier) && new Types.ObjectId(specifier) == specifier){
                // The specifier is a MongooseId
                query = { _id: specifier };
            } else {
                query = { slug: specifier };
            }

            const account = await User.findOne(query).select("-mentions");
            if(!account) return { status: GetAccountResponseEnum.UserNotFound };
            const accountId = account._id;

            // Get Account's Friends
            const friendships = await Friendship.find({ $or: [{user1Id: accountId}, {user2Id: accountId}], isAccepted: true });

            const friends = [];
            for(const friendship of friendships) {
                const friendId = friendship.user1Id == accountId ? friendship.user2Id : friendship.user1Id;
                const friend = await User.findById(friendId).select("-mentions");
                if(friend) friends.push({ friend, friendship });
            } 

            // Get Friendship Between User And Account If Any
            const userFriendship = await Friendship.findOne({ $or: [{user1Id: userId, user2Id: accountId}, {user1Id: accountId, user2Id: userId}] });
            
            // Get Gallery
            let gallery = await Post
                .find({userId: accountId, mediapath: { $ne: null } })
                .limit(20);
            gallery = gallery.map(p => p.mediapath);

            // Stats
            const stats = {
                tweetCount: await Post.countDocuments({userId: accountId}).exec(),
                friendsCount: friendships.length,
                likesCount: (await Post.find({userId: accountId})).reduce((acc, cur) => acc + cur.likes.length, 0),
                sharesCount: (await Post.find({userId: accountId})).reduce((acc, cur) => acc + cur.shares.length, 0),
            }
            
            return { status: GetAccountResponseEnum.Success, account, friends, userFriendship, gallery, stats };
        } catch(e) {
            console.error(e);
            return { status: GetAccountResponseEnum.Error };
        }
    },

    async setSeen(userId) {
        try{
            const user = await User.findById(userId);
            if(user.mentions && user.mentions.length > 0){
                user.mentions = user.mentions.map(mention => {
                    mention.seen = true;
                    return mention;
                });

                user.markModified("mentions");
                user.save();
            }
            
            return SetSeenResponseEnum.Success;
        } catch(e) {
            console.error(e);
            return SetSeenResponseEnum.Error;
        }
    },

    async changeAvatar(userId, filepath) {
        try{
            const user = await User.findById(userId);
            if(!user){
                return { status: ChangeAvatarResponseEnum.UserNotFound };
            } 

            user.avatar = filepath;
            user.save();
            return { status: ChangeAvatarResponseEnum.Success, avatar: filepath };
        } catch(e) {
            return { status: ChangeAvatarResponseEnum.Error };
        }
    },


    async changeNickname(userId, nickname) {
        try{
            const user = await User.findById(userId);
            if(!user) return ChangeNicknameResponseEnum.UserNotFound;

            user.nickname = nickname;
            user.save();
            return ChangeNicknameResponseEnum.Success;
        } catch(e) {
            return ChangeNicknameResponseEnum.Error;
        }
    },

}