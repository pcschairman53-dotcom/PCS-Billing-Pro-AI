import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import app from "./server/app";

// Load environment variables
dotenv.config();

const PORT = 3000;

async function setupServer() {
  // Vite dev server middleware in non-production, or static build folder in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PCS Billing Pro AI server is running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
