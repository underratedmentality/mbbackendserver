require('dotenv').config()
const express = require("express")
const app = express()
const PORT = process.env.PORT || 3000
const mongoose = require("mongoose")
const userRouter = require("./routes/userRouter")

// middleware 
app.use (express.json ())



// Routes 
app.get('/', (req, res) => {
    res.status(200).json({success: true, message: 'Mb Events Server'})
})
app.use("/api/v1", userRouter)

// error route 
app.use((req, res) => {
    res.status(401).json({success: false, message: 'ROUTE NOT FOUND'})
});

//db connection 
const startServer = async () => {
try {
    await mongoose.connect(process.env.MONGO_URL, {dbName: 'mbevents'});
    app.listen (PORT, () => {
        console.log(`server running on port : ${PORT}`);
        
    })
} catch (error) {
 console.log(error);
}
};
startServer();