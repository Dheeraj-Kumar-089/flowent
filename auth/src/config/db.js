import mongoose from 'mongoose';



export const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.warn('[Auth DB] MONGO_URI not provided. Skipping MongoDB connection.');
            return;
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('[Auth DB] MongoDB connected successfully');
    } catch (err) {
        console.error('[Auth DB] MongoDB connection error:', err.message);
    }
};