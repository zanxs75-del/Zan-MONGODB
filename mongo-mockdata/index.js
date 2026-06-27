const express = require('express');
require('dotenv').config();
const cors = require("cors");
const {connect} = require('../db');
const mongoUri = process.env.MONGO_URI;

// 1. create the express application
const app = express();
// 2. use the JSON middleware so that we can recieve JSON requests
app.use(express.json());

async function main()
{
    const db = await connect(process.env.MONGO_URI, "mongodb_data");

    // routes will be here
    app.get("/api/tabulate", async function(req, res){
        const criteria = {};

        if (req.query.name) {
            criteria.name = {
                $regex: req.query.name,
                $options: "i" 
            };
        }

        const tabulate = await db.collection("tabulate").find(criteria).toArray();
        res.json({
            tabulate: tabulate
        });
    });
}
main();



app.listen(3000, function () {
    console.log("Server has started");
})
