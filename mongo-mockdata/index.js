const express = require('express');
require('dotenv').config();
const {connect} = require('./db');
const mongoUri = process.env.MONGO_URI;
const cors = require("cors");
const { ObjectId } = require('mongodb');
const dbName = "zan_leisure";
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// ===== JWT FUNCTION =====
function generateAccessToken(id) {
    return jwt.sign({
        "user_id": id,
        "role": "user"
    }, process.env.SECRET_TOKEN, {
        "expiresIn": "3w"
    });
}

// ===== VERIFY TOKEN MIDDLEWARE =====
function verifyToken(req, res, next) {  
    // Extract out the token from the Authorization header
    const authHeader = req.headers['authorization'];
    
    if (authHeader) {
        const token = authHeader.split(" ")[1];  
        
        if (token) {
            // Verify the token's claims and expiry matches the signature
            jwt.verify(token, process.env.SECRET_TOKEN, function(err, claims) {
                if (err) {
                    return res.status(401).json({  
                        "message": "Token invalid or expired"
                    });
                } else {
                    // Save in the request the logged in user's information
                    req.user = claims;
                    next();
                }
            });
        } else {
            return res.status(401).json({  
                "message": "No token provided"
            });
        }
    } else {
        return res.status(401).json({  
            "message": "Authorization header not found"
        });
    }
}


// 1. Create the express application
const app = express();

// 2. Use middleware
app.use(express.json());
app.use(cors()); // Added CORS middleware

// 3. Health check route
app.get('/health', function (req, res) {
    res.json({
        "message": "I'm alive!"
    });
});

// 4. Main function to connect to database and setup routes
async function main() {
    try {
        const db = await connect(process.env.MONGO_URI, dbName);
        console.log("Database connected successfully");

        // GET route - Search for leisure
        app.get('/api/leisure', async function (req, res) {
            try {
                const criteria = {};

                // Search by title
                if (req.query.name) {
                    criteria.title = {
                        $regex: req.query.name,
                        $options: "i"
                    };
                }

                // Search by tags
                if (req.query.tags) {
                    const wantedTags = req.query.tags.split(",");
                    criteria['tags.name'] = {
                        "$in": wantedTags
                    };
                }

                // Search by conditions
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
                });
            } catch (error) {
                console.error("Error in GET /api/leisure:", error);
                res.status(500).json({ error: error.message });
            }
        });

        // POST route - Create new leisure
        app.post("/api/leisure", async function(req, res) {
            try {
                const newLeisure = req.body;

                // Validate required fields
                if (!newLeisure.title) {
                    return res.status(400).json({ error: "Title is required" });
                }
                if (!newLeisure.places || !newLeisure.places.name) {
                    return res.status(400).json({ error: "Place name is required" });
                }
                if (!newLeisure.tags || !Array.isArray(newLeisure.tags)) {
                    return res.status(400).json({ error: "Tags array is required" });
                }

                // Find the place from database
                const place = await db.collection("places").findOne({
                    name: newLeisure.places.name
                });

                if (!place) {
                    return res.status(404).json({ error: "Place not found" });
                }

                // Find tags from database
                const tags = await db.collection("tags").find({
                    name: {
                        $in: newLeisure.tags
                    }
                }).toArray();

                // Prepare the leisure document with database references
                const leisureDocument = {
                    title: newLeisure.title,
                    places: {
                        id: place._id,
                        name: place.name
                    },
                    conditions: newLeisure.conditions || {},
                    tags: tags.map(tag => ({
                        id: tag._id,
                        name: tag.name
                    })),
                    instructions: newLeisure.instructions || []
                };

                // Insert into leisure collection
                const response = await db.collection("leisure").insertOne(leisureDocument);
                
                res.status(201).json({
                    message: "Successfully created leisure",
                    leisureId: response.insertedId,
                    leisure: leisureDocument
                });
            } catch (error) {
                console.error("Error creating leisure:", error);
                res.status(500).json({ error: error.message });
            }
        });

        // DELETE route - Delete leisure by ID
        app.delete("/api/leisure/:leisureId", async function(req, res) {
            try {
                const leisureId = req.params.leisureId;
                
                // Validate ObjectId
                if (!ObjectId.isValid(leisureId)) {
                    return res.status(400).json({ error: "Invalid leisure ID format" });
                }

                const result = await db.collection("leisure").deleteOne({
                    _id: new ObjectId(leisureId)
                });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ error: "Leisure not found" });
                }

                res.json({
                    message: "The leisure has been deleted",
                    deletedCount: result.deletedCount
                });
            } catch (error) {
                console.error("Error deleting leisure:", error);
                res.status(500).json({ error: error.message });
            }
        });

        // PUT route - Update leisure by ID
        app.put("/api/leisure/:leisureId", async function(req, res) {
            try {
                const leisureId = req.params.leisureId;
                const updateData = req.body;

                // Validate ObjectId
                if (!ObjectId.isValid(leisureId)) {
                    return res.status(400).json({ error: "Invalid leisure ID format" });
                }

                // Check if leisure exists
                const existingLeisure = await db.collection("leisure").findOne({
                    _id: new ObjectId(leisureId)
                });

                if (!existingLeisure) {
                    return res.status(404).json({ error: "Leisure not found" });
                }

                // If place name is being updated, validate it exists
                if (updateData.places && updateData.places.name) {
                    const place = await db.collection("places").findOne({
                        name: updateData.places.name
                    });
                    if (!place) {
                        return res.status(404).json({ error: "Place not found" });
                    }
                    // Update with the database place reference
                    updateData.places = {
                        id: place._id,
                        name: place.name
                    };
                }

                // If tags are being updated, validate they exist
                if (updateData.tags && Array.isArray(updateData.tags)) {
                    const tags = await db.collection("tags").find({
                        name: {
                            $in: updateData.tags
                        }
                    }).toArray();
                    updateData.tags = tags.map(tag => ({
                        id: tag._id,
                        name: tag.name
                    }));
                }

                // Perform the update
                const result = await db.collection("leisure").updateOne(
                    { _id: new ObjectId(leisureId) },
                    { $set: updateData }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ error: "Leisure not found" });
                }

                // Get the updated document
                const updatedLeisure = await db.collection("leisure").findOne({
                    _id: new ObjectId(leisureId)
                });

                res.json({
                    message: "The leisure has been updated",
                    modifiedCount: result.modifiedCount,
                    leisure: updatedLeisure
                });
            } catch (error) {
                console.error("Error updating leisure:", error);
                res.status(500).json({ error: error.message });
            }
        });

        

// Register a new user //  Add this after your other routes      
        app.post('/api/users', async function(req, res) {  
    try {  // ← Added try/catch
        const { email, password } = req.body;

        // Validate required fields
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }
        if (!password) {
            return res.status(400).json({ error: "Password is required" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Validate password strength (at least 6 characters)
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        // Check if user already exists
        const existingUser = await db.collection("users").findOne({
            email: email
        });

        if (existingUser) {
            return res.status(409).json({ error: "User already exists" });
        }

        // Hash password and insert user
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const result = await db.collection("users").insertOne({  
            email: email,
            password: hashedPassword,
            createdAt: new Date()
        });

        res.status(201).json({  
            message: "New user has been created", 
            userId: result.insertedId
        });

    } catch (error) {  // ← Added catch
        console.error("Error creating user:", error);
        res.status(500).json({ error: error.message });
    }
});  

// USER LOGIN 
app.post('/api/login', async function(req, res) {  
    try {  // ← Added try/catch
        const email = req.body.email;  
        const password = req.body.password;  

// Validate required fields
        if (!email) {
        return res.status(400).json({ error: "Email is required" });
        }
        if (!password) {
        return res.status(400).json({ error: "Password is required" });
        }

// Find the user by email
        const user = await db.collection("users").findOne({  
            email: email
        });

        if (user) {
// Check if the password matches
            if (await bcrypt.compare(password, user.password)) {  
                const token = generateAccessToken(user._id);
                res.json({
                     token: token,
                    message: "Login is successful",
                    user: {
                        id: user._id,
                        email: user.email
                    }
            });
            } else {
                 res.status(401).json({
                    message: "Wrong email or password"
                });
            }
            } else {
                res.status(401).json({
                     message: "Wrong email or password"
                });
            }
            } catch (error) {
                console.error("Error during login:", error);
                res.status(500).json({ error: error.message });
            }
        });
        

// ===== GET CURRENT USER (PROTECTED ROUTE) =====
app.get('/api/me', verifyToken, async function(req, res) {  
    try {  
        const user = await db.collection("users").findOne({  
            _id: new ObjectId(req.user.user_id)
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Remove password before sending response
        delete user.password;  

        res.json({  
            user: user
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: error.message });
            }
});




    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }

app.listen(3000, function () {
    console.log("Server has started");
})



}

// Start the application
main();


