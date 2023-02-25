const asyncHandler = require("express-async-handler")
const User = require("../models/userModel")
const sendEmail = require("../utils/sendEmail")

const contactus = asyncHandler(async (req, res) => {

    const { subject, message } = req.body
    const user = User.findById(req.user._id)
    if (!user) {
        res.status(400)
        throw new Error("user not found. Please sign up")
    }

    if (!subject || !message) {
        res.status(400)
        throw new Error("Please add subject and message")
    }

    const send_to = process.env.EMAIL_USER
    const reply_to = user.email
    const sent_from = user.email

    try {
        await sendEmail(subject, message, send_to, sent_from, reply_to)
        res.status(200).json({ success: true, message: "Message sent" })
    } catch (error) {
        res.status(500)
        throw new Error("Email not sent, Please try again")
    }
})
module.exports = {
    contactus
}