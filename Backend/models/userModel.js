const mongoose = require('mongoose');


const userschema = new mongoose.Schema({
    name:String,
    email:String,
    password:{
        type:String,
        minLength:[8],
        maxLength:[32]
    },
    phone:String,
    accountVerified:{type:Boolean,default:false},
    verificationCode:Number,
    verificationCodeExpIn:Date,
    resetPasswordToken:String,
    resetPasswordExpIn:Date
})

const User = mongoose.model('User',userschema);
module.exports = User;