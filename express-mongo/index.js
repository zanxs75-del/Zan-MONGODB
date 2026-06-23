const express = require('express');
require('dotenv').config();
const {connect} = require('./db');
const mongoUri = process.env.MONGO_URI;
const dbName = "sample_mflix;"

// 1. create the express application
const app = express();
// 2. use the JSON middleware so that we can recieve JSON requests
app.use(express.json());
// 3. route
app.get('/health', function (req, res) {
    res.json({
        "message": "I'm alive!"
    })
})
async function main(){


  
}       
main();







app.listen(3000, function () {
    console.log("Server has started");
})