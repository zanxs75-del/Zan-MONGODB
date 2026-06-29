const express = require('express');
require('dotenv').config();
const {connect} = require('./db');
const mongoUri = process.env.MONGO_URI;
const cors = require("cors");
const dbName = "8109_leisure";

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

async function main() {

   
    const db = await connect(process.env.MONGO_URI, "8109_leisure");

    //Search for leisure
    //the req.query can contain the following parameters:
    //name: string pattern for name
    app.get('/api/leisure', async function (req, res) {


        const criteria = {};

        if (req.query.name) {
            criteria.name = {
                $regex: req.query.name,
                $options:"i"
            }
        }

        if (req.query.tags) {
            const wantedTags = req.query.tags.split(",")
            criteria['tags.name'] = {
                "$in": wantedTags
            }
        }

        
        
        if (req.query.conditions) {
            const conditionsArray = req.query.conditions.split(",");
            const orConditions = [];

        for (let condition of conditionsArray) {
        const regex = new RegExp(condition.trim(), "i");
        orConditions.push(
            { "conditions.weather": { $regex: regex } },
            { "conditions.visibility": { $regex: regex } },
            { "conditions.temperature": { $regex: regex } }
            );
        }

    criteria["$or"] = orConditions;
}
        const leisure = await db.collection("leisure").find(criteria).toArray();
        res.json({
            leisure: leisure
        })
    })




}
main();


app.listen(3000, function () {
    console.log("Server has started");
})
    
