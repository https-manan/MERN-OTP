//all req on register are handled here 
const express = require('express');
const registerController = require('../controllers/registerController');
const routes = express.route();

routes.post('/',registerController)


module.exports = routes