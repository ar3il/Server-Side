const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken"); 

const PORT = 5001; 
const MONGO_URI = 'mongodb+srv://Ariel3110:dlXlsvgAD4oKsRAS@phantomusers.wr2ta.mongodb.net/?retryWrites=true&w=majority&appName=PhantomUsers';
const JWT_SECRET = "your_secret_key";
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Mongodb is connected"))
  .catch((err) => console.error("Mongodb connection error:", err));


  const userSchema = new mongoose.Schema({
    name: { type: String, required: true }, 
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true },
    characters: [
      {
        nickname: String,
        characterType: String,
        level: { type: Number, default: 1 },
      },
    ],
  });
const User = mongoose.model("User", userSchema);


app.post("/", async (req, res) => {
  console.log("Received registration request:", req.body); 
  try {
    const { name, email, password } = req.body;
    
    
    if (!name || !email || !password) {
      console.log("Missing fields in request body");
      return res.status(400).json({ error: "All fields are required" });
    }

   
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Email already in use:", email);
      return res.status(400).json({ error: "Email already in use" });
    }

    
    const hashedPassword = await bcryptjs.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    
    const savedUser = await newUser.save();
    console.log("User registered successfully:", savedUser);
    res.status(201).json(savedUser);

  } catch (error) {
    console.error("Error during registration:", error); 
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});




app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for user: ${email}`);
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(400).json({ message: "User not found" });
    }
    
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      console.log(`Invalid credentials for user: ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

   
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});


function verifyToken(req, res, next) {
  const token = req.headers['authorization']; 

  if (!token) {
    console.log("Token is missing in request headers");
    return res.status(403).json({ message: "Token is missing" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Invalid token provided");
      return res.status(401).json({ message: "Invalid token" });
    }
    console.log("Token verified successfully. User ID:", decoded.id);
    req.userId = decoded.id;
    next();
  });
}



app.post("/saveCharacter", verifyToken, async (req, res) => {
  const { nickname, selectedCharacter } = req.body;

  console.log("Save Character Request:", req.body); 

  if (!nickname || !selectedCharacter) {
    console.log("Missing fields: nickname or selectedCharacter");
    return res.status(400).json({ success: false, message: "Nickname and character are required." });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      console.log(`User not found with ID: ${req.userId}`);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User found:", user);

    
    const existingCharacter = user.characters.find(char => char.nickname === nickname);
    if (existingCharacter) {
      console.log(`Character with nickname "${nickname}" already exists for this user.`);
      return res.status(400).json({ success: false, message: "Character with this nickname already exists." });
    }

    
    const newCharacter = {
      nickname,
      characterType: selectedCharacter,
      level: 1, 
    };

    user.characters.push(newCharacter);

    console.log("Saving user with new character:", newCharacter);

    await user.save();

    console.log("Character saved successfully:", newCharacter); 

    return res.status(201).json({ success: true, character: newCharacter });
  } catch (error) {
    console.error("Error saving character:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});



app.post("/updateLevel", verifyToken, async (req, res) => {
  const { level, nickname } = req.body;

  if (typeof level !== 'number') {
    return res.status(400).json({ message: "Level must be a number." });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const character = user.characters.find(char => char.nickname === nickname);
    if (!character) {
      return res.status(404).json({ message: "Character not found." });
    }

    character.level = level;
    await user.save();

    console.log(`Level for character ${nickname} updated to: ${level}`);
    return res.status(200).json({ success: true, message: "Level updated successfully." });
  } catch (error) {
    console.error("Error updating level:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});




app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
