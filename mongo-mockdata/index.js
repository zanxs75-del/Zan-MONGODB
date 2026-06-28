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

        app.get("/api/tabulate", async function(req, res) {
        const criteria = {};

        if (req.query.name) {
            criteria.name = {
                $regex: req.query.name,
                $options: "i" 
            };
        }

        if (req.query.tags) {
            const wantedTags = req.query.tags.split(",");
            criteria['tags.name'] = {
                "$in": wantedTags
            };
        }

        // Expecting req.query.conditions to be a comma-delimited string
        if (req.query.conditions) {
            const conditionsArray = req.query.conditions.split(",");
            const regexArray = [];

            for (let conditions of conditionsArray) {
                
                regexArray.push(new RegExp(conditions.trim(), "i")); 
            }

            criteria["conditions.name"] = {
                $in: regexArray
            };
        }

        const tabulate = await db.collection("tabulate").find(criteria).toArray();
        res.json({
            tabulate: tabulate
        });
    });


    app.post("/api/tabulate", async function(req, res) {
    try {
        const newTabulate = req.body;

        // Validate required fields
        if (!newTabulate.location || !newTabulate.location.name) {
            return res.status(400).json({ 
                error: "Location name is required" 
            });
        }

        if (!newTabulate.tags || !Array.isArray(newTabulate.tags)) {
            return res.status(400).json({ 
                error: "Tags array is required" 
            });
        }

        const location = await db.collection("location").findOne({
            name: newTabulate.location.name
        });

        if (!location) {
            return res.status(404).json({ 
                error: "Location not found" 
            });
        }

        const tags = await db.collection("tags").find({
            name: { $in: req.body.tags }
        }).toArray();

        // Replace location and tags
        newTabulate.location = location;
        newTabulate.tags = tags;

        const respond = await db.collection("tabulate").insertOne(newTabulate);
        
        res.status(201).json({
            message: "Successfully created tabulate",
            tabulateId: respond.insertedId
        });
    } catch (error) {
        console.error("Error creating tabulate:", error);
        res.status(500).json({ 
            error: "Internal server error", 
            details: error.message 
        });
    }
}); 
} 

main();

app.listen(3000, function () {
    console.log("Server has started");
});
