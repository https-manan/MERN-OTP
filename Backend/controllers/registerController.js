const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodeMailer = require('nodemailer');


function sendEmail({email,subject,message}){
    const transporter = nodeMailer.createTransport({
        host:process.env.SMTP_HOST,
        service:process.env.SMTP_SERVICE,
        port:process.env.SMTP_PORT,
        auth:{
            user:process.env.SMTP_MAIL,
            pass:
        }
    })
}


function generateVerificationCode(){
    function generateRandomNumber(){
        const number = Math.floor(Math.random()*100000);
        return number
    }
    const verificationCode = generateRandomNumber();
    return verificationCode; 
}

async function registerController(req, res) {
    try {
        const { name, email, password, phone ,verificactionMethod} = req.body;

        if (!name || !email || !password || !phone || !verificactionMethod) {
            return res.status(400).send('All credentials needed');
        }

        function phoneNoValidation(phone) {
            const phoneRegex = /^\+91\d{10}$/;
            return phoneRegex.test(phone);
        }

        if (!phoneNoValidation(phone)) {
            return res.status(400).send('Invalid phone number format');
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userstore = await User.create({
            name,
            email,
            password: hashedPassword,
            phone
        });

        return res.status(201).json({
            msg: 'User created successfully',
            user: {
                id: userstore._id,
                name: userstore.name,
                email: userstore.email,
                phone: userstore.phone
            }
        });
 
        async function sendVerificationCode(verificactionMethod,verificationCode,email,phone) {
            if(verificactionMethod === 'email'){
                const message = generateEmailTemp(verificationCode);
                sendEmail({email,subject:'Your verificaation code is...',message})
            }            
        }

        const verificationCode = await userstore.generateVerificationCode();// here we r generating the verification code and saving in DB
        await userstore.save();
        sendVerificationCode(verificactionMethod,verificationCode,email,phone); // In this we r sending the verification code to the user

    } catch (error) {
        console.error(error); 
        res.status(500).send({
            msg: 'Internal server error'
        });
    }
}

function generateEmailTemp(){
    return `<div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
  <h2 style="color: #4CAF50; text-align: center;">Verification Code</h2>

  <p style="font-size: 16px; color: #333;">Dear User,</p>
  <p style="font-size: 16px; color: #333;">Your verification code is:</p>

  <div style="text-align: center; margin: 20px 0;">
    <span style="display: inline-block; font-size: 24px; font-weight: bold; color: #4CAF50; padding: 10px 20px; border: 1px solid #4CAF50; border-radius: 5px;">
      ${verificationCode}
    </span>
  </div>

  <p style="font-size: 16px; color: #333;">Please use this code to verify your email address. The code will expire in 10 minutes.</p>
  <p style="font-size: 16px; color: #333;">If you did not request this, please ignore this email.</p>

  <footer style="margin-top: 20px; text-align: center; font-size: 14px; color: #999;">
    <p>Thank you,<br>Your Company Team</p>
    <p style="font-size: 12px; color: #aaa;">This is an automated message. Please do not reply to this email.</p>
  </footer>
</div>
`
}



module.exports = registerController;
