require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/* ===============================
   🔥 MongoDB Connection (Cached)
================================= */
let client;
let db;

async function connectDB() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    db = client.db("software");
    console.log("✅ MongoDB Connected");
  }
  return db;
}

/* Middleware to attach DB */
app.use(async (req, res, next) => {
  try {
    req.db = await connectDB();
    next();
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "DB connection failed" });
  }
});

/* ===============================
   ROOT
================================= */
app.get("/", (req, res) => {
  res.send("🚀 Server Running...");
});

/* ===============================
   👤 USER ROUTES
================================= */

// Add user
app.post("/add-user", async (req, res) => {
  try {
    const col = req.db.collection("user");
    const userData = req.body;

    const exist = await col.findOne({ email: userData.email });
    if (exist) return res.send(exist);

    const result = await col.insertOne(userData);
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: err.message });
  }
});

// Get all users
app.get("/get-all-users", async (req, res) => {
  try {
    const col = req.db.collection("user");
    const users = await col.find({}).toArray();
    res.send(users);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Get user role
app.get("/get-user-role", async (req, res) => {
  try {
    const email = req.query.email;
    const col = req.db.collection("user");

    if (!email) return res.status(400).send({ message: "Email required" });

    const user = await col.findOne({ email }, { projection: { role: 1 } });
    if (!user) return res.status(404).send({ message: "User not found" });

    res.send({ role: user.role });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Get user by email
app.get("/users/:email", async (req, res) => {
  try {
    const col = req.db.collection("user");
    const user = await col.findOne({ email: req.params.email });

    if (!user) return res.status(404).send({ message: "User not found" });
    res.send(user);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Update user
app.put("/users/:email", async (req, res) => {
  try {
    const col = req.db.collection("user");

    const result = await col.updateOne(
      { email: req.params.email },
      { $set: req.body }
    );

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Update role
app.patch("/update-role", async (req, res) => {
  try {
    const col = req.db.collection("user");

    const result = await col.updateOne(
      { email: req.body.email },
      { $set: { role: req.body.role } }
    );

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Update status
app.patch("/update-status", async (req, res) => {
  try {
    const col = req.db.collection("user");

    const result = await col.updateOne(
      { email: req.body.email },
      { $set: { status: req.body.status } }
    );

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

/* ===============================
   🩸 VOLUNTARY DONORS
================================= */

app.post("/add-voluntary-donor", async (req, res) => {
  try {
    const col = req.db.collection("voluntaryDonors");

    const exist = await col.findOne({ email: req.body.email });
    if (exist) return res.status(400).send({ message: "Already donor" });

    const result = await col.insertOne(req.body);
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.get("/voluntary-donors", async (req, res) => {
  try {
    const col = req.db.collection("voluntaryDonors");
    const result = await col.find({}).toArray();
    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

/* ===============================
   🩸 DONATION REQUEST
================================= */

// Create request
app.post("/create-donation-request", async (req, res) => {
  try {
    const db = req.db;
    const userCol = db.collection("user");
    const reqCol = db.collection("donationRequests");

    const data = req.body;
    const user = await userCol.findOne({ email: data.requesterEmail });

    if (!user) return res.status(404).send({ message: "User not found" });
    if (user.status === "blocked")
      return res.status(403).send({ message: "Blocked user" });

    const result = await reqCol.insertOne({
      ...data,
      requesterName: user.name,
      donationStatus: "pending",
      createdAt: new Date(),
    });

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Public requests
app.get("/public-donation-requests", async (req, res) => {
  try {
    const col = req.db.collection("donationRequests");

    const result = await col
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// My requests
app.get("/my-donation-requests", async (req, res) => {
  try {
    const col = req.db.collection("donationRequests");

    const result = await col
      .find({ requesterEmail: req.query.email })
      .toArray();

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Update donation (accept)
app.patch("/donation-request/:id", async (req, res) => {
  try {
    const col = req.db.collection("donationRequests");

    const result = await col.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Cancel donation
app.patch("/cancel-donation/:id", async (req, res) => {
  try {
    const col = req.db.collection("donationRequests");

    const result = await col.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: { donationStatus: "pending" },
        $unset: { donorName: "", donorEmail: "" },
      }
    );

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// Delete request
app.delete("/donation-requests/:id", async (req, res) => {
  try {
    const col = req.db.collection("donationRequests");

    const result = await col.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

app.patch("/admin/update-status/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    const filter = { _id: new ObjectId(id) };

    const donationReq = await db
      .collection("donationRequests")
      .findOne(filter);

    if (!donationReq) {
      return res.status(404).send({ message: "Request not found" });
    }

    const updateDoc = {
      $set: { donationStatus: status },
    };

    if (status === "canceled") {
      updateDoc.$set.donationStatus = "pending";
      updateDoc.$unset = {
        donorId: "",
        donorName: "",
        donorEmail: "",
      };
    }

    await db.collection("donationRequests").updateOne(filter, updateDoc);

    // 🔔 notification part
    const notification = {
      recipients: [
        donationReq.requesterEmail,
        donationReq.donorEmail,
      ].filter(Boolean),
      message: `Donation request for ${donationReq.recipientName} is ${status}`,
      type: status,
      timestamp: new Date(),
      isRead: false,
    };

    await db.collection("notifications").insertOne(notification);

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ message: "Update failed" });
  }
});

/* ===============================
   🔔 NOTIFICATIONS
================================= */

app.get("/notifications/:email", async (req, res) => {
  try {
    const result = await req.db
      .collection("notifications")
      .find({ recipients: { $in: [req.params.email] } })
      .sort({ timestamp: -1 })
      .toArray();

    res.send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

/* ===============================
   🚀 START
================================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});