const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

mongoose
  .connect("mongodb://localhost:27017/unicoins", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true, default: uuidv4 },
  name: String,
  email: { type: String, unique: true },
  balance: { type: Number, default: 0 },
  uniCoins: { type: Number, default: 5 },
});

const User = mongoose.model("User", UserSchema);

const TransactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true, default: uuidv4 },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: "Success" },
  type: { type: String, enum: ["Redeem", "Payment"], required: true },
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model("Transaction", TransactionSchema);

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/faq", (req, res) => {
  res.render("Faq");
});

app.post("/login", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.redirect("/register");
  res.redirect(`/wallet/${user.userId}`);
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).send("Name and Email are required!");

  if (!email.endsWith("@presidencyuniversity.in")) {
    return res.status(400).send("Only Presidency University emails are allowed.");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.send("User already registered. Try logging in.");

  const newUser = new User({
    userId: uuidv4(),
    name,
    email,
    balance: 0,
    uniCoins: 5,
  });

  await newUser.save();
  res.redirect(`/wallet/${newUser.userId}`);
});

app.get("/wallet", (req, res) => {
  res.render("wallet");
});

app.get("/wallet/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });

    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.render("wallet", { user });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.get("/redeem/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).send("User not found.");
    res.render("redeem", { user });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.post("/redeem", async (req, res) => {
  try {
    const { userId, coins } = req.body;

    if (!userId || !coins) {
      return res.status(400).json({ error: "User ID and coins are required" });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.uniCoins < coins) {
      return res.status(400).json({ error: "Insufficient UniCoins" });
    }

    user.uniCoins -= coins;
    user.balance += coins;
    await user.save();

    const transaction = new Transaction({
      transactionId: uuidv4(),
      userId,
      amount: coins,
      status: "Success",
      type: "Redeem",
    });

    await transaction.save();
    res.redirect(`/wallet/${user.userId}`);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/leaderboard", async (req, res) => {
  try {
    const redeemTransactions = await Transaction.aggregate([
      { $match: { type: "Redeem" } },
      {
        $group: {
          _id: "$userId",
          totalRedeemed: { $sum: "$amount" },
        },
      },
      { $sort: { totalRedeemed: -1 } },
      { $limit: 10 },
    ]);

    const userIds = redeemTransactions.map((t) => t._id);
    const users = await User.find({ userId: { $in: userIds } });

    const leaderboard = redeemTransactions.map((t) => {
      const user = users.find((u) => u.userId === t._id);
      return { name: user ? user.name : "Unknown", totalRedeemed: t.totalRedeemed };
    });

    res.render("leaderboard", { leaderboard });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});
app.get("/payment/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });

    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.render("payment", { user });
  } catch (error) {
    console.error("Error loading payment page:", error);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/paymen/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });

    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.render("paymen", { user });
  } catch (error) {
    console.error("Error loading payment page:", error);
    res.status(500).send("Internal Server Error");
  }});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
