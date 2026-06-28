const express = require('express');
require('dotenv').config();
const cors = require("cors");
const {connect} = require('../db');
const mongoUri = process.env.MONGO_URI;

// 1. create the express application
const app = express();
// 2. use the JSON middleware so that we can recieve JSON requests
app.use(express.json());

//Search for tabulate
//req.query can contain following parameters:
//name: string pattern for the name

async function main() {
    const db = await connect(process.env.MONGO_URI, "mongodb_data");

    // routes will be here

    app.post("/api/tabulate", async function(req, res) {
        const newTabulate = req.body; // Fixed: Changed comma to semicolon

        const location = await db.collection("location").findOne({
          name: newTabulate.location.name // Extract the string from the object
    });

        const tags = await db.collection("tags").find({
          name: {
        $in: req.body.tags.map(t => t.name) // Extract an array of strings from the objects
     }
    }).toArray();

        // replace the newTabulate location and tags with the ones from the database
        newTabulate.location = location;
        newTabulate.tags = tags;

        const respond = await db.collection("tabulate").insertOne(newTabulate);
        res.json({
            message: "Successfully created tabulate",
            tabulateId: respond.insertedId
        });
    }); // Fixed: Added closing braces for the route handler
} // Fixed: Added closing brace for the main function

main();

app.listen(3000, function () {
    console.log("Server has started");
});
