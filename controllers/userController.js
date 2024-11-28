const USER = require("../models/user");
const { sendWelcomeEmail, sendResetPasswordEmail} = require("../emails/sendmail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const generateToken = ({ userId, email }) => {
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  return token;
};

// REGISTER USER
const registerUser = async (req, res) => {
  //get access to the req.body
  const { email, fullName, password } = req.body;
  try {
    //check if the user already
    const existingUser = await USER.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    //create user (save to db)
    const user = await USER.create({
      fullName,
      email,
      password,
    });

    const clientUrl = `${process.env.FRONTEND_URL}`/login;
    try {
      await sendWelcomeEmail({
        email: user.email,
        fullName: user.fullName,
        clientUrl,
      });
    } catch (error) {
      console.log("error sending email", error);
    }

    res
      .status(201)
      .json({ success: true, message: "User registered successfully", user });
  } catch (error) {
    console.log(error);

    res.status(400).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and Password is required" });
  }
  try {
    //find user
    const user = await USER.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    //compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Credentials" });
    }

    //generate token - jwt jsonwebtoken
    const token = generateToken({ userId: user._id, email: user.email });
    res.status(200).json({
      success: true,
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const forgotPassword = async (req, res) => {
 const {email} = req.body 
 if(!email) {
    return res.status(400).json
    ({success: false, message: 'Please Provide Email'})
 }
 // check if user exists
 const user = await USER.findOne ({email})
 if (!user){
    return res.status(404).json({success: false, message: 'User not found'})
 }
 // generate resetToken
 const resetToken = jwt.sign({id:user._id}, process.env.JWT_SECRET,{
    expiresIn: '15m'
 })
 // save the reset token and its expiry in the data base
 try {
    user.resetToken = resetToken,
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save()
     // create reset link for the frontend 
 const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token{resetToken}`
 // send email to user
 try {
    await sendResetPasswordEmail ({
        email: user.email,
        fullName: user.fullName,
        resetUrl,
    });
 }catch (error){
    console.log("error sending email");
    
 }
res.status(200).json({
    success: true,
    message:"Password reset link sent to your mail",
    resetToken
})
}
 catch (error) {
res.status(400).json({success: false, message: 'something went wrong', error: error.message})
 }

};
const resetPassword = async (req, res) => {
    const { newPassword, token } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Provide token and new password" });
    }
  
    //verify the token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      //find the user with the token
      const user = await USER.findOne({
        _id: decoded.id,
        resetToken: token,
        resetTokenExpiry: { $gt: Date.now() },
      });
  
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid or expired token" });
      }
      //update the user password
      user.password = newPassword;
      //clear reset token fields
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await user.save();
      res
        .status(200)
        .json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
};