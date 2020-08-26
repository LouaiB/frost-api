const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureHasRoles } = require('../config/auth');

router.get('/any', (req, res) => res.send('Any'));
router.get('/authenticated', ensureAuthenticated, (req, res) => res.send('Authenticated'));
router.get('/user', ensureHasRoles(['user']), (req, res) => res.send('User'));
router.get('/admin', ensureHasRoles(['admin']),(req, res) => res.send('Admin'));
router.get('/useradmin', ensureHasRoles(['user', 'admin']),(req, res) => res.send('User & Admin'));

module.exports = router;
