
const mongoose = require("mongoose");

const { MONGODB_USERNAME, MONGO_PASSWORD } = process.env;

const connectDB = async () => {
    try {
        const user = encodeURIComponent((MONGODB_USERNAME || "").trim());
        const pass = encodeURIComponent((MONGO_PASSWORD || "").trim());
        await mongoose.connect(`mongodb+srv://${user}:${pass}@cluster0.58d7jpy.mongodb.net/mystore?retryWrites=true&w=majority`);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};


module.exports = { connectDB };
