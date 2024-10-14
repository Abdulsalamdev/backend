const express = require("express");
const {
  SignUpValidator,
  User,
  LoginValidator,
  ResetPasswordValidator,
} = require("../model/user");
const router = express.Router();
const bycrpt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
dotenv.config();

const {
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  EMAIL,
  EMAIL_PASSWORD,
} = process.env;

// access token generator
const AccessTokenGenerator = (user) => {
  return jwt.sign({ id: user._id }, ACCESS_TOKEN, {
    subject: "access token",
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
};

// refresh topken generator
const RefreshTokenGenerator = (user) => {
  return jwt.sign({ id: user._id }, REFRESH_TOKEN, {
    subject: "refresh token",
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
};

// otp generator
const OtpGenerator = () => {
  return crypto.randomInt(100000, 999999).toString();
};
// creating sign up route
router.post("/signUp", async (req, res) => {
  try {
    const { full_name, email, username, password, policy } = req.body;
    const { error } = SignUpValidator(req.body);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    const user = await User.findOne({ email });
    if (user) return res.status(400).send({ message: "User already exists" });

    const hashed = await bycrpt.hash(password, 10);

    const newUser = new User({
      email,
      full_name,
      username,
      password: hashed,
      policy,
    });
    await newUser.save();

    return res.status(201).send({
      message: "user successfully created",
      newUser,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// creating logiin route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { error } = LoginValidator(req.body);
    if (error)
      return res.status(200).send({ message: error.details[0].message });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found" });

    const verified = await bycrpt.compare(password, user.password);
    if (!verified) return res.status(400).send({ message: "Invalid Password" });

    const accessToken = AccessTokenGenerator(user);
    const refreshToken = RefreshTokenGenerator(user);

    return res.status(200).send({
      message: "user successfully login",
      user,
      token: { accessToken, refreshToken },
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// creating forget password routes
router.post("/forget-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found" });

    const otp = OtpGenerator();
    const otpExpiresIn = Date.now() + 15 * 60 * 1000;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      debug: true, // Use `true` for port 465, `false` for all other ports
      auth: {
        user: EMAIL,
        pass: EMAIL_PASSWORD,
      },
    });
    const mailOptions = {
      from: EMAIL,
      to: email,
      subject: "Password Reset Otp",
      html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Recovery OTP</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
        }
        .otp {
            font-size: 30px;
            font-weight: bold;
            color: #007bff;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 20px;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        p {
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Password Recovery</h2>
        </div>
        <p>Hello,</p>
        <p>We received a request to reset your password. Please use the following OTP to proceed with resetting your password:</p>
        <div class="otp">${otp}</div>
        <p>This OTP is valid for the next 15 minutes. If you did not request a password reset, please ignore this email.</p>
        
            <p>If you have any questions, feel free to contact our support team.</p>
        </div>
    </div>
</body>
</html>
`,
    };
    user.otp = otp;
    user.otpExpires = otpExpiresIn;
    await user.save();

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) return res.status(400).send({ message: error });
      return res.status(200).send({
        success: "OTP Sent successfully",
      });
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// verify otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ message: "user not found" });

    if (!user.otp == otp)
      return res.status(400).send({ message: "Invalid  OTP" });

    if (user.otpExpires < Date.now())
      return res.status(400).send({ message: "Otp expired" });

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(200).send({ message: "OTP successfully verifyed" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

//reset password
router.post("/reset-password", async (req, res) => {
  try {
    const { password, confirmPassword, email } = req.body;
    const { error } = ResetPasswordValidator(req.body);
    if (error)
      return res.status(400).send({ message: error.details[0].message });

    const hashed = await bycrpt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { email },
      {
        password: hashed,
      },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!user) res.status(400).send({ message: "User not found" });

    return res.status(200).send({ message: "Password Successfully updated" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// refresh token route
router.post("/refresh-token", async (req, res) => {
  const { refreshToken, email } = req.body;
  let accessToken;
  try {
    const user = await User.findOne({ email });
    if (!user) res.status(400).send({ message: " email not found" });
    if (user.refreshToken === null)
      res.status(404).send({ message: " refresh token not found" });

    const decodedRefreshToken = jwt.verify(refreshToken, REFRESH_TOKEN);
    if (decodedRefreshToken) {
      accessToken = AccessTokenGenerator(user);
    } else {
      return res.status(401).send({ message: "token invalid or expired" });
    }

    return res.status(200).send({
      id: user._id,
      accessToken,
    });
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return res
        .status(400)
        .send({ message: "refresh token invalid or expired" });
    }
    res.status(500).send({ message: error.message });
  }
});
module.exports = router;
