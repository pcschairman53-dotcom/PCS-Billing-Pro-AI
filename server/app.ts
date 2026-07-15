import express from "express";
import { connectDatabase } from "./db";
import authRoutes from "./routes/auth";
import actionRoutes from "./routes/action";
import aiRoutes from "./routes/ai";

const app = express();

// Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize database connection
connectDatabase();

// API Route Bindings
app.use("/api/auth", authRoutes);
app.use("/api/action", actionRoutes);
app.use("/api/ai", aiRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", databaseConnected: mongooseConnectionState() });
});

function mongooseConnectionState() {
  try {
    const mongoose = require("mongoose");
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}

export default app;
export { app };
