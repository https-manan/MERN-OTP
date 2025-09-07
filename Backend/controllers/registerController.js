const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodeMailer = require('nodemailer');
const twilio = require('twilio')
const jwt = require('jsonwebtoken')
const client = twilio(process.env.TWILIO_SID,process.env.TWILIO_TOKEN);
const cookie = require('cookie-parser');


async function sendToken(user, res) {
    const token = jwt.sign({ user_id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.status(200).cookie("token", token, {
        httpOnly: true, 
        maxAge: 3600000
    }).json({ token });
}



async function sendEmail({email,subject,message}){
    const transporter = nodeMailer.createTransport({
        host:process.env.SMTP_HOST,
        service:process.env.SMTP_SERVICE,
        port:process.env.SMTP_PORT,
        auth:{
            user:process.env.SMTP_MAIL,
            pass:process.env.SMTP_PASSWORD,
        },
    });
    const options = {
        from:process.env.SMTP_MAIL,
        to:email,
        subject,
        html:message
    }
    await transporter.sendMail(options);
}

function generateVerificationCode(){
    function generateRandomNumber(){
        const number = Math.floor(Math.random()*100000);
        return number
    }
    const verificationCode = generateRandomNumber();
    const verificationCodeExpIn = Date.now() + 30*60*1000;
    return { verificationCode, verificationCodeExpIn };
}

async function sendVerificationCode(verificationMethod,verificationCode,email,phone) {
    if(verificationMethod === 'email'){
        const message = generateEmailTemp(verificationCode);
        await sendEmail({email,subject:' ',message})
    }else if(verificationMethod === 'phone'){
        const verificationCodeWithSpace = verificationCode.toString().split('').join(' ');
        await client.calls.create({
            twiml:`<Response><Say>Your verification code is ${verificationCodeWithSpace}.Your verification code is ${verificationCodeWithSpace}</Say></Response>`,
            from:process.env.TWILIO_PHONE,
            to:phone
        })
    }
}

function generateEmailTemp(verificationCode){
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

async function registerController(req, res) {
    try {
        const { name, email, password, phone, verificationMethod } = req.body; 
        
        if (!name || !email || !password || !phone || !verificationMethod) {
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
        
       
        const { verificationCode, verificationCodeExpIn } = generateVerificationCode();
        
        const userstore = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            verificationCode,
            verificationCodeExpIn
        });
        

        await sendVerificationCode(verificationMethod, verificationCode, email, phone);
        
        return res.status(201).json({
            msg: 'User created successfully',
            user: {
                id: userstore._id,
                name: userstore.name,
                email: userstore.email,
                phone: userstore.phone
            }
        });

    } catch (error) {
        console.error(error); 
        res.status(500).send({
            msg: 'Internal server error'
        });
    }
}


async function verifyOTP(req, res) {
    try {
        const { email, phone, otp } = req.body;//okey here we r getting the email,phone,OTP from body

        const phoneNoValidation = (phone) => /^\+91\d{10}$/.test(phone);
        if (!phoneNoValidation(phone)) {
            return res.status(400).send({ Msg: 'Invalid phone number' });
        }

        const userAllEntries = await User.find({
            $or: [
                { email, accountVerified: false },
                { phone, accountVerified: false }
            ]
        }).sort({ createdAt: -1 }); //Here we are sorting for the latest OTP

        if (!userAllEntries || userAllEntries.length === 0) {
            return res.status(404).json({ success: false, message: 'Send an OTP.' });
        }

        let user = userAllEntries[0]; //Storing only last top user and deleting all rest of the user

        if (userAllEntries.length > 1) {
            await User.deleteMany({
                _id: { $ne: user._id },
                $or: [{ email, accountVerified: false }, { phone, accountVerified: false }]
            });
        }

        if (user.verificationCode !== otp) {
            return res.status(400).send({ success: false, message: "Invalid OTP" });
        }

        if (Date.now() > user.verificationCodeExpIn) {
            return res.status(400).send({ success: false, message: 'Code has expired.' });
        }

        user.accountVerified = true;
        user.verificationCode = null;
        user.verificationCodeExpIn = null;
        await user.save();

        await sendToken(user, res);

    } catch (error) {
        console.error('Internal server error ', error);
        res.status(500).send({ msg: 'Internal server error' });
    }
}


async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                msg: 'Email and password are required.'
            });
        }

        const user = await User.findOne({ email, accountVerified: true });

        if (!user) {
            return res.status(400).send({
                success: false,
                msg: 'User not found or not verified'
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(400).send({
                success: false,
                msg: 'Wrong password',
            });
        }
        return res.status(200).json({
            success: true,
            msg: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send({
            success: false,
            msg: 'Internal server error'
        });
    }
}

async function logout(req, res) {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ success: false, msg: "No token found" });
        }

        try {
            jwt.verify(token, process.env.JWT_SECRET); 
        } catch (err) {
            return res.status(401).json({ success: false, msg: "Invalid or expired token" });
        }

        res.clearCookie("token");
        res.status(200).json({ success: true, msg: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ success: false, msg: "Server error" });
    }
}


module.exports = { registerController, verifyOTP ,login ,logout};