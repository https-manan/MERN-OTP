const mongoose = require('mongoose');
const dotenv = require('dotenv').config();


async function dbconnection(){ 
    await mongoose.connect(process.env.DB_URL);
    console.log(`Connected to DB`);
}

module.exports = dbconnection;