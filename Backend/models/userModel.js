const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: {
    type: String,
    required: true
  },
  phone: { type: String, unique: true, required: true },
  accountVerified: { type: Boolean, default: false },
  verificationCode: String,
  verificationCodeExpIn: Date,
  resetPasswordToken: String,
  resetPasswordExpIn: Date
});

const User = mongoose.model('User', userSchema);
module.exports = User;
