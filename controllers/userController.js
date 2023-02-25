const asyncHandler = require("express-async-handler")
const User = require("../models/userModel")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const Token = require("../models/tokenModels")
const crypto = require("crypto")
const sendEmail = require("../utils/sendEmail")

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" })
}
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body
    //validation
    if (!name || !email || !password) {
        res.status(400)
        throw new Error("Please fill in all required fields")
    }
    if (password.length < 6) {
        res.status(400)
        throw Error("password must be upto 6 characters")
    }

    //check if user email already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
        res.status(400)
        throw Error("Email has already been registered")
    }


    //create user
    const user = await User.create({
        name,
        email,
        password
    })

    //Generate Token
    const token = generateToken(user._id)

    //send HTTP-only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400),//1 Day
        sameSite: "none",
        secure: true
    })
    if (user) {
        const { _id, name, email, photo, phone, bio } = user
        res.status(201).json({
            _id, name, email, photo, phone, bio, token
        })
    } else {
        res.status(400)
        throw Error("Invalid user data")
    }
})


const loginUser = asyncHandler(async (req, res) => {

    const { email, password } = req.body

    if (!email || !password) {
        res.status(400)
        throw new Error("Please add email and password")
    }

    //check if user exists
    const user = await User.findOne({ email })
    if (!user) {
        res.status(400)
        throw new Error("User not found, please signup")
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.password)

    //Generate Token
    const token = generateToken(user._id)

    //send HTTP-only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400),//1 Day
        sameSite: "none",
        secure: true,
    });

    if (user && passwordIsCorrect) {
        const { _id, name, email, photo, phone, bio } = user
        res.status(201).json({
            _id, name, email, photo, phone, bio, token
        })
    } else {
        res.status(400)
        throw new Error("Invalid email or password")
    }


})


const logout = async (req, res) => {
    res.cookie("token", "", {
        path: "/",
        httpOnly: true,
        expires: new Date(0),
        sameSite: "none",
        secure: true,
    });
    return res.status(200).json({ message: "Successfully logged out" })
}
const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
    if (user) {
        const { _id, name, email, photo, phone, bio } = user
        res.status(201).json({
            _id, name, email, photo, phone, bio
        })
    } else {
        res.status(400)
        throw new Error("User Not Found")
    }
})

const loginStatus = async (req, res) => {

    const token = req.headers.token
    console.log(token)
    if (!token) {
        return res.json(false)
    }
    const verified = jwt.verify(token, process.env.JWT_SECRET)
    if (verified) {
        return res.json(true)
    }
}
const updateUser = async (req, res) => {
    const user = await User.findById(req.user._id)
    if (user) {
        const { _id, name, email, photo, phone, bio } = user
        user.email = email;
        user.name = req.body.name || name;
        user.phone = req.body.phone || phone;
        user.bio = req.body.bio || bio;
        user.photo = req.body.photo || photo;

        const updatedUser = await user.save()
        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            photo: updatedUser.photo,
            phone: updatedUser.phone,
            bio: updateUser.bio
        })
    } else {
        res.status(404)
        throw new Error("user not found")
    }

}
const changePassword = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
    const { oldPassword, password } = req.body
    if (!user) {
        res.status(400)
        throw new Error("user not found, please signup")
    }
    if (!oldPassword || !password) {
        res.status(400)
        throw new Error("Please add old and new password")
    }

    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password)
    if (user && passwordIsCorrect) {
        user.password = password
        await user.save()
        res.status(200).send("Password changed successfully")
    } else {
        res.status(400)
        throw new Error("Old password is incorrect")
    }
})

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) {
        res.status(404)
        throw new Error("User does not exist")
    }

    let token = await Token.findOne({ userId: user._id })
    if (token) {
        await token.deleteOne()
    }
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id
    console.log(resetToken)
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    await new Token({
        userId: user._id,
        token: hashedToken,
        createdAt: Date.now(),
        expiredAt: Date.now() + 30 * (60 * 1000)
    }).save()
    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`

    const message = `<h2>Hello ${user.name}</h2>
    <p>Please use the url below to reset your password</p>
    <p>This reset link is valid for only 3o minutes.</p>
    <a href=${resetUrl} clicktracking=off>{resetUrl}</a>
    <p>Regards...</p>
    <p>P Invent team</p>
    `;

    const subject = "Password Reset Request"
    const send_to = user.email
    const sent_from = process.env.EMAIL_USER

    try {
        await sendEmail(subject, message, send_to, sent_from)
        res.status(200).json({ success: true, message: "Reset email sent" })
    } catch (error) {
        res.status(500)
        throw new Error("Email not sent, Please try again")
    }
    response.send("ForgotPassword")
})


const resetPassword = asyncHandler(async (req, res) => {
    const { password } = req.body
    const { resetToken } = req.params

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex")

    const userToken = await Token.findOne({
        token: hashedToken,
        expiredAt: { $gt: Date.now() }
    })

    if (!userToken) {
        res.status(500)
        throw new Error("Invalid or Expired token")
    }

    const user = await User.findOne({ _id: userToken.userId })
    user.password
    await user.save()
    res.status(200).json({
        message: "Password reset successsful, please login"
    })
})

module.exports = {
    registerUser,
    loginUser,
    logout,
    getUser,
    loginStatus,
    updateUser,
    changePassword,
    forgotPassword,
    resetPassword
}