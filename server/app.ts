import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDatabase } from "./db";
import authRoutes from "./routes/auth";
import actionRoutes from "./routes/action";
import aiRoutes from "./routes/ai";

// Ensure environment variables are loaded
dotenv.config();

const app = express();

// Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Simple request logger for debugging
app.use((req, res, next) => {
  console.log(`[Express Request] ${req.method} ${req.url}`);
  next();
});

// Initialize database connection
connectDatabase();

// API Route Bindings
app.use("/api/auth", authRoutes);
app.use("/api/action", actionRoutes);
app.use("/api/ai", aiRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", databaseConnected: mongoose.connection.readyState === 1 });
});

// Global Error Handler returning JSON error responses instead of HTML
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Express Error Caught:", err);
  res.status(err?.status || 500).json({
    success: false,
    error: err?.message || "Internal Server Error",
    stack: process.env.NODE_ENV !== "production" ? err?.stack : undefined
  });
});

export default app;
export { app };
