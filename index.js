 // index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB  = require("./db/db")
// Load .env variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000; // fallback if env var missing

connectDB()


// Middleware
app.use(cors());
app.use(express.json());

//EXPORT ROUTES 
const tutor = require("./routes/tutorRoutes")
const book = require("./routes/oldBooks")

//routes 
app.use('/api' , tutor)
app.use("/api/book" , book)

// Simple Route
app.get('/', (req, res) => {
  res.send('Hello from Express backend!');
});



// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
