const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const nodeMailer = require('nodemailer');
const twilio = require('twilio')

const client = twilio(process.env.TWILIO_SID,process.env.TWILIO_TOKEN);

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
        await sendEmail({email,subject:'Your verification code is ****',message})
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
        const { name, email, password, phone, verificationMethod } = req.body; // Fixed typo
        
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
        
        // Generate verification code
        const { verificationCode, verificationCodeExpIn } = generateVerificationCode();
        
        const userstore = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            verificationCode,
            verificationCodeExpIn
        });
        
        // Send verification code
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

module.exports = registerController;