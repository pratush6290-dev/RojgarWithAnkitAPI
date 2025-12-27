require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ====================================================
// 👇 AAPKA FINAL DATABASE CONNECTION 👇
// ====================================================
const MONGO_URI = process.env.MONGO_URI;

// --- Database Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully! (Badhai Ho!)"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// --- Schema (Data Design) ---
const batchSchema = new mongoose.Schema({
    id: { type: String, unique: true }, 
    course_name: String,
    raw_data: Object // Poora data backup
});

const Batch = mongoose.model('Batch', batchSchema);

// --- API Routes ---

// 1. Home Route
app.get('/', (req, res) => {
    res.send("RojgarWithAnkitAPI is Running Live! 🚀");
});

// 2. Data Update Route (Original se lekar DB me save karega)
app.get('/api/update-batches', async (req, res) => {
    try {
        console.log("Fetching from Original Source...");
        // Original API call
        const response = await axios.get("https://rwawebfree.vercel.app/api/proxy?endpoint=/get/mycoursev2?");
        const batches = response.data.data; 

        if (!batches) return res.status(400).json({ msg: "No data found" });

        let savedCount = 0;
        for (let item of batches) {
            // Agar ID pehle se hai to update karo, nahi to naya banao
            await Batch.findOneAndUpdate(
                { id: item.id },
                { 
                    id: item.id,
                    course_name: item.course_name,
                    raw_data: item
                },
                { upsert: true, new: true }
            );
            savedCount++;
        }

        res.json({
            success: true,
            message: `Successfully synced ${savedCount} batches to MongoDB!`,
            timestamp: new Date()
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Main API (Jo App me use hogi - Saved Data Dikhane ke liye)
app.get('/api/my-batches', async (req, res) => {
    try {
        // Database se data nikalo
        const data = await Batch.find({}, { raw_data: 1, _id: 0 });
        
        // Original format wapas banate hain
        const formattedData = data.map(b => b.raw_data);
        
        res.json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

});
