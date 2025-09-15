import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  // Check current connection state
  const connectionState = mongoose.connection.readyState;

  // If already connected (1) or connecting (2), skip connection
  if (connectionState === 1) {
    console.log("MongoDB is already connected");
    return;
  }
  if (connectionState === 2) {
    console.log("MongoDB connection is in progress");
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      autoIndex: true, // Automatically build indexes
      connectTimeoutMS: 10000, // Timeout after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log("MongoDB connected successfully");
  } catch (error: unknown) {
    console.error(`MongoDB connection error: ${error}`);
    process.exit(1); // Exit process on connection failure
  }
};

// Handle connection events
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (error) => {
  console.error(`Mongoose connection error: ${error}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("Mongoose disconnected from MongoDB");
});

// Handle process termination
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Mongoose connection closed due to app termination");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mongoose.connection.close();
  console.log("Mongoose connection closed due to app termination");
  process.exit(0);
});

export default connectDB;
