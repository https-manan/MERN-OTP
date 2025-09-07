
const express = require('express');
const {login} = require('../controllers/registerController');
const routes = express.Router();

routes.post('/',login)


module.exports = routes 