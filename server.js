const bodyParser = require("body-parser")
const express = require("express")
const dotenv = require("dotenv").config()
const mongoose = require("mongoose")
const cors = require("cors")
const userRoute = require("./routes/userRoute")
const errorHandler = require("./middleWare/errorMiddleWare")
const cookieParser = require("cookie-parser")


const app = express()


//middlewares
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: false }))

// app.use(bodyParser.json)
const PORT = process.env.PORT || 5000

//routes middleware
app.use("/api/v1/users", userRoute)
//routes
app.get("/", (req, res) => {
    res.send("Home page")
})

//Error middleware, should be just above app.listen
app.use(errorHandler)

// connect to db and start server
mongoose.connect(process.env.MONGO_URI).then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    })
}).catch((err) => {
    console.log(err)
    process.exit(1)
})