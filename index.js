require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB setup
const client = new MongoClient(process.env.MONGO_URI);

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("software");
    const userCollection = db.collection("user");

    // send user data in DB
    app.post("/add-user", async (req, res) => {
      const userData = req.body;
      try {
        const user = await userCollection.findOne({
          email: userData.email,
        });
        if (user) {
          return res.send(user);
        }
        const result = await userCollection.insertOne(userData);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // sokol user ke pabo

    app.get("/get-all-users", async (req, res) => {
      try {
        const users = await userCollection.find({}).toArray(); 
        res.send(users);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // user er role ta niye asbe

    app.get("/get-user-role", async (req, res) => {
      const email = req.query.email;

      try {
        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const user = await userCollection.findOne(
          { email },
          { projection: { role: 1 } },
        );

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ role: user.role });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Server error" });
      }
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}

// Call connectDB
connectDB();

// Routes
app.get("/", (req, res) => {
  res.send("Hello Express!");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
