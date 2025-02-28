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

app.get("/", (req, res) => {
  res.render("index");
});


app.listen(PORT)