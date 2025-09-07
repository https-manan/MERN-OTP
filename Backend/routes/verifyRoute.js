const express = require('express');
const {verifyOTP} = require('../controllers/registerController');
const routes = express.Router();

routes.post('/',verifyOTP)



module.exports = routes 