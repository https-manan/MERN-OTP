const express = require('express');
const { logout} = require('../controllers/registerController');
const routes = express.Router();

routes.post('/',logout)


module.exports = routes 