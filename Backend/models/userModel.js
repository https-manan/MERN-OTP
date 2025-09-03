const mongoose = require('mongoose');


const userschema = new mongoose.Schema({
    name:String,
    email:String,
    password:String,
    phone:String,
    accountVerified:Boolean,
    verificationCode:Number,
    verificationCodeExpIn:Date,
    resetPasswordToken:String,
    resetPasswordExpIn:Date
})

const User = mongoose.model('User',userschema);
module.exports = User;