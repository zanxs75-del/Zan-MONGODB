const express = require('express');
require('dotenv').config();
const {connect} = require('./db');
const mongoUri = process.env.MONGO_URI;
const cors = require("cors");
const dbName = "sample_mflix;"




// 1. create the express application
const app = express();
// 2. use the JSON middleware so that we can recieve JSON requests
app.use(express.json());



async function main() {
  try {
    const db = await connect(mongoUri, dbname);
    console.log('Connected to MongoDB');
    // Add your route code here
	  app.get("/", function(req, res) {
     
    })
  } catch (error) {
    console.error('Error connecting to MongoDB', error);
  }
}
main();
   

    
 

app.listen(3000, function () {
    console.log("Server has started");
})