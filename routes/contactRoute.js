const express = require("express")
const { contactus } = require("../controllers/contactController")
const protect = require("../middleWare/authMiddleware")
const router = express.Router()


router.post("/", protect, contactus)

module.exports = router