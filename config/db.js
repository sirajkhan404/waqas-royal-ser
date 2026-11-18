
const mongoose = require("mongoose");

const { MONGODB_USERNAME, MONGO_PASSWORD } = process.env;

let isConnected = false;

const connectDB = async () => {
    if (isConnected || mongoose.connection.readyState >= 1) {
        return;
    }
    try {
        const user = encodeURIComponent((MONGODB_USERNAME || "").trim());
        const pass = encodeURIComponent((MONGO_PASSWORD || "").trim());
        await mongoose.connect(`mongodb+srv://${user}:${pass}@cluster0.58d7jpy.mongodb.net/mystore?retryWrites=true&w=majority`);
        isConnected = true;
        console.log("MongoDB Connected");
    } catch (error) {
        console.error("MongoDB Connection Error:", error);
    }
};

module.exports = { connectDB };
