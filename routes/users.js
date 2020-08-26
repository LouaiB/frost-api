const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../helpers/crypt');
const UserManager = require('../managers/user.manager');
const { ensureAuthenticated, ensureHasRoles } = require('../config/auth');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

router.post('/register', async (req, res) => {
    try{

        let { email, password, nickname, slug } = req.body;
        if(!nickname) nickname = null;
        let errors = [];
    
        // TODO: Validation
        if(!email || !password || !slug){
            errors.push('Email, password, and slug required.');
        }
    
        if(errors.length > 0){
            return res.status(400).json({ message: 'One or more validation errors occured.', errors });
        } else {
            // Check if unique email
            const user = await User.findOne({ $or: [{email: email}, {slug: slug}] });
            if(user){
                return res.status(400).json({ message: `${user.email == email ? 'Email' : 'Slug'} already taken.` });
            } else {
                const newUser = new User({ email, password, slug, nickname });
                console.log(newUser);
    
                // Hash Password
                newUser.password = bcrypt.hashSync(newUser.password);
    
                newUser.save()
                    .then(user => {
                        return res.json(user);
                    })
                    .catch(err => res.status(500).json({ message: 'Failed to add user to database.' }));
            }
        }
    }catch(err){
        res.status(500).json({ message: 'Error with registration.' })
    }

});

router.post('/token', (req, res) => {
    const { email, password } = req.body;
    let errors = [];

    // TODO: Validation
    if(!email || !password){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        // Check if correct
        User.findOne({ email: email })
            .then(user => {
                if(!(user && bcrypt.compareSync(password, user.password))){
                    res.status(400).json({ message: 'Invalid login.' });
                } else {
                    // Generate Token
                    const token = encrypt(JSON.stringify({ _id: user._id, password: user.password }));
    
                    res.json({ token, userId: user._id, nickname: user.nickname, avatar: user.avatar, slug: user.slug, mentions: user.mentions });
                }
            });
    }
});

router.post('/refresh', async (req, res) => {
    try{
        const { token } = req.body;
        let errors = [];
    
        // TODO: Validation
        if(!token){
            errors.push('All fields required.');
            return res.status(400).json({ invalidToken: false, message: 'One or more validation errors occured.', errors });
        } else {
            // Check if correct
            const user = JSON.parse(decrypt(token));
            const curUser = await User.findById(user._id);
    
            if(!curUser) {
                return res.status(400).json({ invalidToken: true, message: 'Invalid token.' });
            } else {
                const newToken = encrypt(JSON.stringify({ _id: curUser._id, password: curUser.password }));
                return res.json({ invalidToken: false, user: curUser, token: newToken });
            } 
        }

    } catch(err) {
        return res.status(500).json({ invalidToken: false, message: 'Error refreshing token.' });
    }
});

router.post('/changePassword', ensureAuthenticated, async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    let errors = [];

    // Validation
    if(!userId || !oldPassword || !newPassword){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await UserManager.changePassword(userId, oldPassword, newPassword)){
            case UserManager.ChangePasswordResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.ChangePasswordResponseEnum.InvalidOldPassword:
                res.status(400).json({ message: 'Incorrect old password.' });
                break;
            case UserManager.ChangePasswordResponseEnum.Success:
                res.json({ message: 'Password changed successfully.' });
                break;
            case UserManager.ChangePasswordResponseEnum.Error:
                res.status(500).json({ message: 'Error updating user.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
})

router.post('/addRole', ensureAuthenticated, async (req, res) => {
    const { userId, newRole } = req.body;
    let errors = [];

    // Validation
    if(!userId || !newRole){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await UserManager.addRole(userId, newRole)){
            case UserManager.AddRoleResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.AddRoleResponseEnum.Success:
                res.json({ message: 'Added role successfully.' });
                break;
            case UserManager.AddRoleResponseEnum.Error:
                res.status(500).json({ message: 'Error updating user.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
});

router.post('/removeRole', ensureAuthenticated, async (req, res) => {
    const { userId, oldRole } = req.body;
    let errors = [];

    // Validation
    if(!userId || !oldRole){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await UserManager.removeRole(userId, oldRole)){
            case UserManager.RemoveRoleResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.RemoveRoleResponseEnum.Success:
                res.json({ message: 'Removed role successfully.' });
                break;
            case UserManager.RemoveRoleResponseEnum.Error:
                res.status(500).json({ message: 'Error updating user.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
});

router.post('/sendFriendRequest', ensureAuthenticated, async (req, res) => {
    const { user2Id } = req.body;
    let errors = [];

    // Validation
    if(!user2Id){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        const result = await UserManager.sendFriendRequest(req.userId, user2Id);
        switch(result.status){
            case UserManager.SendFriendRequestResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.SendFriendRequestResponseEnum.User2NotFound:
                res.status(404).json({ message: 'Recepient user not found.' });
                break;
            case UserManager.SendFriendRequestResponseEnum.RequestAlreadySent:
                res.status(400).json({ message: 'Request already sent.' });
                break;
            case UserManager.SendFriendRequestResponseEnum.Success:
                res.json({ message: 'Friend request sent successfully.', newFriendship: result.newFriendship });
                break;
            case UserManager.SendFriendRequestResponseEnum.Error:
                res.status(500).json({ message: 'Error sending friend request.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
})

router.post('/acceptFriendRequest', ensureAuthenticated, async (req, res) => {
    const { requestId } = req.body;
    let errors = [];

    // Validation
    if(!requestId){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await UserManager.acceptFriendRequest(req.userId, requestId)){
            case UserManager.AcceptFriendRequestResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.AcceptFriendRequestResponseEnum.RequestNotFound:
                res.status(404).json({ message: 'Friend request not found.' });
                break;
            case UserManager.AcceptFriendRequestResponseEnum.UserNotMatched:
                res.status(400).json({ message: 'User not matched to request.' });
                break;
            case UserManager.AcceptFriendRequestResponseEnum.Success:
                res.json({ message: 'Friend request accepted successfully.' });
                break;
            case UserManager.AcceptFriendRequestResponseEnum.Error:
                res.status(500).json({ message: 'Error accepting friend request.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
})

router.post('/declineFriendRequest', ensureAuthenticated, async (req, res) => {
    const { requestId } = req.body;
    let errors = [];

    // Validation
    if(!requestId){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await UserManager.declineFriendRequest(req.userId, requestId)){
            case UserManager.DeclineFriendRequestResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.DeclineFriendRequestResponseEnum.RequestNotFound:
                res.status(404).json({ message: 'Friend request not found.' });
                break;
            case UserManager.DeclineFriendRequestResponseEnum.UserNotMatched:
                res.status(400).json({ message: 'User not matched to request.' });
                break;
            case UserManager.DeclineFriendRequestResponseEnum.Success:
                res.json({ message: 'Friend request declined successfully.' });
                break;
            case UserManager.DeclineFriendRequestResponseEnum.Error:
                res.status(500).json({ message: 'Error declining friend request.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
})

router.post('/undeclineFriendRequest', ensureAuthenticated, async (req, res) => {
    const { requestId } = req.body;
    let errors = [];

    // Validation
    if(!requestId){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await UserManager.undeclineFriendRequest(req.userId, requestId)){
            case UserManager.UndeclineFriendRequestResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.UndeclineFriendRequestResponseEnum.RequestNotFound:
                res.status(404).json({ message: 'Friend request not found.' });
                break;
            case UserManager.UndeclineFriendRequestResponseEnum.UserNotMatched:
                res.status(400).json({ message: 'User not matched to request.' });
                break;
            case UserManager.UndeclineFriendRequestResponseEnum.Success:
                res.json({ message: 'Friend request undeclined successfully.' });
                break;
            case UserManager.UndeclineFriendRequestResponseEnum.Error:
                res.status(500).json({ message: 'Error undeclining friend request.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
})

router.post('/cancelFriendRequest', ensureAuthenticated, async (req, res) => {
    const { requestId } = req.body;
    let errors = [];

    // Validation
    if(!requestId){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await UserManager.cancelFriendRequest(req.userId, requestId)){
            case UserManager.CancelFriendRequestResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.CancelFriendRequestResponseEnum.RequestNotFound:
                res.status(404).json({ message: 'Friend request not found.' });
                break;
            case UserManager.CancelFriendRequestResponseEnum.UserNotMatched:
                res.status(400).json({ message: 'User not matched to request.' });
                break;
            case UserManager.CancelFriendRequestResponseEnum.Success:
                res.json({ message: 'Friend request canceled successfully.' });
                break;
            case UserManager.CancelFriendRequestResponseEnum.Error:
                res.status(500).json({ message: 'Error canceling friend request.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
})

router.post('/unfriend', ensureAuthenticated, async (req, res) => {
    const { friendshipId } = req.body;
    let errors = [];

    // Validation
    if(!friendshipId){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await UserManager.unfriend(req.userId, friendshipId)){
            case UserManager.UnfriendResponseEnum.UserNotFound:
                res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.UnfriendResponseEnum.RequestNotFound:
                res.status(404).json({ message: 'Friend request not found.' });
                break;
            case UserManager.UnfriendResponseEnum.UserNotMatched:
                res.status(400).json({ message: 'User not matched to request.' });
                break;
            case UserManager.UnfriendResponseEnum.Success:
                res.json({ message: 'Unfriended successfully.' });
                break;
            case UserManager.UnfriendResponseEnum.Error:
                res.status(500).json({ message: 'Error Unfriending.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
})

router.get('/friends', ensureAuthenticated, async (req, res) => {
    const friends = await UserManager.getFriends(req.userId);

    switch(friends.status){
        case UserManager.GetFriendsResponseEnum.UserNotFound:
            res.status(404).json({ message: 'User not found.' });
            break;
        case UserManager.GetFriendsResponseEnum.Success:
            res.json(friends.friends);
            break;
        case UserManager.GetFriendsResponseEnum.Error:
            res.status(500).json({ message: 'Error getting friends.' });
            break;
        default:
            res.json({ message: 'Default response.' });
            break;
    }
})

router.get('/friendships', ensureAuthenticated, async (req, res) => {
    const friends = await UserManager.getFriendships(req.userId);

    switch(friends.status){
        case UserManager.GetFriendshipsResponseEnum.UserNotFound:
            res.status(404).json({ message: 'User not found.' });
            break;
        case UserManager.GetFriendshipsResponseEnum.Success:
            res.json(friends.friends);
            break;
        case UserManager.GetFriendshipsResponseEnum.Error:
            res.status(500).json({ message: 'Error getting friendships.' });
            break;
        default:
            res.json({ message: 'Default response.' });
            break;
    }
})

router.post('/searchUsers', ensureAuthenticated, async (req, res) => {
    const { query } = req.body;
    let errors = [];

    // Validation
    if(!query){
        errors.push('All fields required.')
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        const result = await UserManager.searchUsers(query);

        switch(result.status){
            case UserManager.SearchUsersResponseEnum.Success:
                res.json({ message: 'Searched successfully.', users: result.users });
                break;
            case UserManager.SearchUsersResponseEnum.Error:
                res.status(500).json({ message: 'Error searching users.' });
                break;
            default:
                res.json({ message: 'Default response.' });
                break;
        }
    }
})

router.get('/account/:id', ensureAuthenticated, async (req, res) => {
    const accountId = req.params.id;
    const account = await UserManager.getAccount(accountId, req.userId);
    
    switch(account.status){
        case UserManager.GetAccountResponseEnum.UserNotFound:
            res.status(404).json({ message: 'User not found.' });
            break;
        case UserManager.GetAccountResponseEnum.Success:
            res.json({ 
                user: account.account,
                friends: account.friends,
                userFriendship: account.userFriendship,
                gallery: account.gallery,
                stats: account.stats 
            });
            break;
        case UserManager.GetAccountResponseEnum.Error:
            res.status(500).json({ message: 'Error getting account.' });
            break;
        default:
            res.json({ message: 'Default response.' });
            break;
    }
})

router.post('/setSeen', ensureAuthenticated, async (req, res) => {    
    switch(await UserManager.setSeen(req.userId)){
        case UserManager.SetSeenResponseEnum.Success:
            res.json({ message: 'Set seen successfully.' });
            break;
        case UserManager.SetSeenResponseEnum.Error:
            res.status(500).json({ message: 'Error setting seen.' });
            break;
        default:
            res.json({ message: 'Default response.' });
            break;
    }
})

const avatarUpload = multer({
    storage: multer.diskStorage({
        // Setting directory on disk to save uploaded files
        destination: function (req, file, cb) {
            cb(null, 'uploads/original-avatars')
        },
    
        // Setting name of file saved
        filename: function (req, file, cb) {
            cb(null, file.fieldname + '-' + Date.now() + '-' + req.userId + path.extname(file.originalname))
        }
    }),
    limits: {
        // Setting Image Size Limit to 1MBs
        fileSize: 1000000
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

router.post('/changeAvatar', ensureAuthenticated, async (req, res) => {
    avatarUpload.single('avatar')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(500).json({ message: err.message });
        }
    
        // Everything went fine.
        const file = req.file;
        let errors = [];

        // Validation
        if(!file){
            errors.push('Avatar image required.');
        }

        if(errors.length > 0){
            res.status(400).json({ message: 'One or more validation errors occured.', errors });
        } else {
            sharp(`uploads/original-avatars/${file.filename}`)
                .resize(200, 200, { fit: 'cover' })
                .toFile(`uploads/avatars/${file.filename}`)
                .then(async info => {
                    const result = await UserManager.changeAvatar(req.userId, 'avatars/' + file.filename);
                    switch(result.status){
                        case UserManager.ChangeAvatarResponseEnum.UserNotFound:
                            return res.status(404).json({ message: 'User not found.' });
                            break;
                        case UserManager.ChangeAvatarResponseEnum.Success:
                            return res.json({ message: 'Avatar changed successfully.', avatar: result.avatar });
                            break;
                        case UserManager.ChangeAvatarResponseEnum.Error:
                            return res.status(500).json({ message: 'Error changing avatar.' });
                            break;
                        default:
                            return res.json({ message: 'Default response.' });
                            break;
                    }
                })
                .catch(err => {
                    return res.status(500).json({ message: `Error resizing avatar. ${err.message}` }); 
                });
        }
    })
})

router.post('/changeNickname', ensureAuthenticated, async (req, res) => {
    const { nickname } = req.body;
    let errors = [];

    // Validation
    if(!nickname){
        errors.push('Nickname required.');
    } else if(nickname.length < 3) {
        errors.push('Nickname must be three characters long or more.')
    }

    if(errors.length > 0){
        res.status(400).json({ message: 'One or more validation errors occured.', errors });
    } else {
        switch(await UserManager.changeNickname(req.userId, nickname)){
            case UserManager.ChangeNicknameResponseEnum.UserNotFound:
                return res.status(404).json({ message: 'User not found.' });
                break;
            case UserManager.ChangeNicknameResponseEnum.Success:
                return res.json({ message: 'Nickname changed successfully.' });
                break;
            case UserManager.ChangeNicknameResponseEnum.Error:
                return res.status(500).json({ message: 'Error changing nickname.' });
                break;
            default:
                return res.json({ message: 'Default response.' });
                break;
        }
    }
})

module.exports = router;
