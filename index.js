require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
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
    const donationRequestCollection = db.collection("donationRequests");
    const voluntaryDonorsCollection = db.collection("voluntaryDonors");

    // Add voluntary donor route
    app.post("/add-voluntary-donor", async (req, res) => {
      try {
        const donorData = req.body;
        const existingDonor = await voluntaryDonorsCollection.findOne({
          email: donorData.email,
        });
        if (existingDonor) {
          return res
            .status(400)
            .send({ message: "You are already a voluntary donor!" });
        }
        const result = await voluntaryDonorsCollection.insertOne(donorData);
        res.send(result);
      } catch (error) {
        console.error("Error adding voluntary donor:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

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

    // create donation request

    app.post("/create-donation-request", async (req, res) => {
      try {
        const donationData = req.body;
        const userEmail = donationData.requesterEmail;

        if (!userEmail) {
          return res.status(400).send({ message: "Email is required" });
        }

        const user = await userCollection.findOne({ email: userEmail });

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        if (user.status === "blocked") {
          return res.status(403).send({
            message: "You are blocked and cannot create donation request",
          });
        }

        const donationRequest = {
          requesterName: user.name,
          requesterEmail: user.email,
          recipientName: donationData.recipientName,
          recipientDistrict: donationData.recipientDistrict,
          recipientUpazila: donationData.recipientUpazila,
          hospitalName: donationData.hospitalName,
          fullAddress: donationData.fullAddress,
          bloodGroup: donationData.bloodGroup,
          donationDate: donationData.donationDate,
          donationTime: donationData.donationTime,
          requestMessage: donationData.requestMessage,
          donationStatus: "pending",
          createdAt: new Date(),
        };

        const result =
          await donationRequestCollection.insertOne(donationRequest);

        res.send({
          insertedId: result.insertedId,
          message: "Donation request created successfully",
        });
      } catch (error) {
        console.error("Error creating donation request:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // profile section

    app.get("/users/:email", async (req, res) => {
      const user = await userCollection.findOne({ email: req.params.email });
      res.send(user);
    });

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;

      const updateDoc = {
        $set: {
          name: req.body.name,
          photoURL: req.body.photoURL,
          bloodGroup: req.body.bloodGroup,
          district: req.body.district,
          upazila: req.body.upazila,
          districtName: req.body.districtName,
          upazilaName: req.body.upazilaName,
        },
      };

      const result = await userCollection.updateOne(
        { email: email },
        updateDoc,
      );

      res.send(result);
    });

    app.patch("/update-status", async (req, res) => {
      const { email, status } = req.body;
      try {
        const result = await userCollection.updateOne(
          { email },
          { $set: { status } },
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error updating status" });
      }
    });

    app.patch("/update-role", async (req, res) => {
      const { email, role } = req.body;
      try {
        const result = await userCollection.updateOne(
          { email: email },
          {
            $set: { role },
          },
        );
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error updating role" });
      }
    });

    // GET public donation requests
    app.get("/public-donation-requests", async (req, res) => {
      try {
        const result = await donationRequestCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch requests" });
      }
    });

    app.patch("/donation-request/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { donationStatus, donorId, donorName, donorEmail } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            donationStatus,
            donorId,
            donorName,
            donorEmail,
          },
        };
        const result = await donationRequestCollection.updateOne(
          filter,
          updateDoc,
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Update failed" });
      }
    });
    // user er id diye data
    app.get("/user-by-id/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const user = await userCollection.findOne(query);

        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send(user);
      } catch (error) {
        res.status(500).send({ message: "Error fetching user" });
      }
    });

    //  user donation cencle korte chaile
    app.patch("/cancel-donation/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { donationStatus: "pending" },
          $unset: { donorId: "", donorName: "", donorEmail: "" },
        };
        const result = await donationRequestCollection.updateOne(
          filter,
          updateDoc,
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Cancel failed" });
      }
    });

    // Admin status update (Done or Cancel)
    app.patch("/admin/update-status/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body; // status can be 'done' or 'canceled'
        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: { donationStatus: status },
        };

        // যদি স্ট্যাটাস ক্যানসেল করা হয়, তবে ডোনারের তথ্য মুছে দিয়ে আবার 'pending' করা যেতে পারে
        if (status === "canceled") {
          updateDoc.$set.donationStatus = "pending";
          updateDoc.$unset = { donorId: "", donorName: "", donorEmail: "" };
        }

        const result = await donationRequestCollection.updateOne(
          filter,
          updateDoc,
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Status update failed" });
      }
    });

    // my donation request

    app.get("/my-donation-requests", async (req, res) => {
      const email = req.query.email;
      const requests = await donationRequestCollection
        .find({ requesterEmail: email })
        .toArray();
      res.send(requests);
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
