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
// 👇 DATABASE CONNECTION 👇
// ====================================================
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// --- Schema ---
const batchSchema = new mongoose.Schema({
    id: { type: String, unique: true }, 
    course_name: String,
    raw_data: Object 
});

const Batch = mongoose.model('Batch', batchSchema);

// ====================================================
// 👇 ROUTES 👇
// ====================================================

// 1. Home Route (Ab JSON format me dikhega)
app.get('/', (req, res) => {
    res.json({
        "message": "🚀 RojgarWithAnkitAPI API is Live and Running!",
        "status": "Healthy",
        "sync_interval": "Every 2-5 minutes",
        "endpoints": {
            "all_batches": "/api/my-batches",
            "force_sync": "/api/update-batches",
            "batch_details": "/chapter/[batch_id]",
            "pdf_details": "/pdf/[batch_id]"
        },
        "author": "𓍯𝐆𝐮𝐩𝐭𝐚✿"
    });
});

// 2. Data Update Route
app.get('/api/update-batches', async (req, res) => {
    try {
        console.log("Fetching from Original Source...");
        const response = await axios.get("https://rwawebfree.vercel.app/api/proxy?endpoint=/get/mycoursev2?");
        const batches = response.data.data; 

        if (!batches) return res.status(400).json({ msg: "No data found" });

        let savedCount = 0;
        for (let item of batches) {
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
        res.status(500).json({ error: error.message });
    }
});

// 3. Main API (Saved Data)
app.get('/api/my-batches', async (req, res) => {
    try {
        const data = await Batch.find({}, { raw_data: 1, _id: 0 });
        const formattedData = data.map(b => b.raw_data);
        res.json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ====================================================
// 👇 SELF-PING LOGIC (24/7 Render Pe Chalane Ke Liye) 👇
// ====================================================
const API_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:'+PORT}`;

setInterval(() => {
    // Ye har 5 minute me khud ko ping karega
    axios.get(API_URL)
        .then(() => console.log("Keeping API Alive... ✅"))
        .catch((err) => console.log("Ping Failed: ", err.message));
}, 300000); // 300000ms = 5 minutes


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
