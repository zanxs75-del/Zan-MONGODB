const express = require('express');
require('dotenv').config();
const {connect} = require('./db');
const mongoUri = process.env.MONGO_URI;
const cors = require("cors");
const dbName = "sample_mflix";




// 1. create the express application
const app = express();
// 2. use the JSON middleware so that we can recieve JSON requests
app.use(express.json());
// 3. route
app.get('/health', function(req,res){
  res.json({
    "message":"I am alive!"
  })
})


    
async function main() {

    try {
        const db = await connect(mongoUri, dbName);

        app.get('/movies', async function (req, res) {
            try {
                const movies = await db.collection("movies")
                    .find({})
                    .project({
                        "title": 1,
                        "plot": 1
                    })
                    .limit(10)
                    .toArray();
                res.json({
                    "movies": movies
                })

            } catch (error) {
                console.error(error);
                res.json({
                    'error': error
                })
            }
        });

        // example calls: /theaters/IN  or /theaters/TX or /theaters/PA
        app.get('/theaters/:state', async function (req, res) {
            try {
                const state = req.params.state;
                const theatres = await db.collection('theaters')
                    .find({
                        "location.address.state": state
                    })
                    .project({
                        "location.address": 1
                    })
                    .toArray();

                res.json({
                    theatres: theatres
                })

            } catch (e) {
                console.error(e);
                res.status(500).json({
                    "error": e
                })
            }
        })

        // query strings:
        // ?date=1990-01-01&email=asd@asd.com 
        // this will become in object in req.query:
        // {
        //    "date":"1990-01-01",
        //    "email":"asd@asd.com"
        // }
        app.get('/comments', async function (req, res) {
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const email = req.query.email;

            try {

            const comments = await db.collection('comments')
                                .find({
                                    date: {
                                        $gte: new Date(startDate),
                                        $lte: new Date(endDate)
                                    },
                                    email: email
                                }).toArray();
            res.json({
                comments: comments
            })

            } catch (e) {
                console.error(e);
                res.status(500).json({
                    'error': e
                })
            }
        })

    } catch (error) {
        throw (error);
    }

}
main();


app.listen(3000, function () {
    console.log("Server has started");
})
