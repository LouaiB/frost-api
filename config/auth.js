const { encrypt, decrypt } = require('../helpers/crypt');
const User = require('../models/User');

module.exports = {
    ensureAuthenticated: async (req, res, next) => {
        console.log("Ensure Auth: " + req.url);
        let token = null;
        try{
            token = decrypt(req.headers.authorization)
        }
        catch(err) { 
            console.log("Unauthorized Access");
            return res.status(401).json({ message: 'You must log in first.' });
        }

        if(!token){
            return res.status(401).json({ message: 'You must log in first.' });
        } else {
            const user = JSON.parse(token);
            const dbUser = await User.findOne({_id: user._id, password: user.password});
            if(!dbUser){
                return res.status(401).json({ message: 'You must log in first.' });
            } else {
                req.userId = user._id;
                return next();
            }
        }
    },

    ensureHasRoles: (roles) => (req, res, next) => {
        let token = null;
        try{
            token = decrypt(req.headers.authorization)
        }
        catch(err) { 
            console.log(err);
            res.status(401).json({ message: 'You must log in first.' });
        }

        if(!token){
            res.status(401).json({ message: 'You must log in first.' });
        } else{
            const user = JSON.parse(token);
            User.findOne({_id: user._id, password: user.password}, (err, dbUser) => {
                if(!dbUser){
                    res.status(401).json({ message: 'You must log in first.' });
                } else {
                    // Check Roles
                    let valid = true;
                    roles.forEach(role => {
                        if(!dbUser.roles.includes(role)){
                            valid = false;
                        }
                    });
        
                    if(!valid){
                        res.status(401).json({ message: 'You are not authorized to perform this action.' });
                    } else {
                        req.userId = dbUser._id;
                        return next();
                    }
                }
            });
        }
    },

    ensureHasARole: (roles) => (req, res, next) => {
        let token = null;
        try{
            token = decrypt(req.headers.authorization)
        }
        catch(err) { 
            console.log(err);
            res.status(401).json({ message: 'You must log in first.' });
        }

        if(!token){
            res.status(401).json({ message: 'You must log in first.' });
        } else{
            const user = JSON.parse(token);
            User.findById({_id: user._id, password: user.password}, (err, user) => {
                if(!user){
                    res.status(401).json({ message: 'You must log in first.' });
                } else {
                    // Check Roles
                    let valid = false;
                    roles.forEach(role => {
                        if(user.roles.includes(role)){
                            valid = true;
                        }
                    });
        
                    if(!valid){
                        res.status(401).json({ message: 'You are not authorized to perform this action.' });
                    } else {
                        req.userId = user._id;
                        return next();
                    }
                }
            });
        }
    }
}