import mongoose from "mongoose";
import { Company, User } from "./models";

const MONGODB_URI = process.env.MONGODB_URI;

export function sanitizeMongoUri(uri: string): string {
  if (!uri) return uri;
  try {
    const match = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
    if (!match) return uri;
    const [_, scheme, rest] = match;
    
    const lastAtIndex = rest.lastIndexOf('@');
    if (lastAtIndex === -1) return uri;
    
    const credentials = rest.substring(0, lastAtIndex);
    const hostAndOptions = rest.substring(lastAtIndex + 1);
    
    const firstColonIndex = credentials.indexOf(':');
    if (firstColonIndex === -1) {
      return scheme + (credentials.includes('%') ? credentials : encodeURIComponent(credentials)) + "@" + hostAndOptions;
    }
    
    const username = credentials.substring(0, firstColonIndex);
    const password = credentials.substring(firstColonIndex + 1);
    
    const encodedUsername = username.includes('%') ? username : encodeURIComponent(username);
    const encodedPassword = password.includes('%') ? password : encodeURIComponent(password);
    
    return scheme + encodedUsername + ":" + encodedPassword + "@" + hostAndOptions;
  } catch (err) {
    console.error("Error sanitizing Mongo URI:", err);
    return uri;
  }
}

const SANITIZED_MONGODB_URI = MONGODB_URI ? sanitizeMongoUri(MONGODB_URI) : "";

export const isAtlasConfigured = !!(
  SANITIZED_MONGODB_URI &&
  (SANITIZED_MONGODB_URI.startsWith("mongodb://") || SANITIZED_MONGODB_URI.startsWith("mongodb+srv://")) &&
  !SANITIZED_MONGODB_URI.includes("<username>") &&
  !SANITIZED_MONGODB_URI.includes("<password>") &&
  !SANITIZED_MONGODB_URI.includes("127.0.0.1") &&
  !SANITIZED_MONGODB_URI.includes("localhost")
);

export let isDbConnected = false;

// Custom hashing helper to match the frontend and server hashing
export function hashPassword(password: string): string {
  if (!password) return "";
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
}

export async function connectDatabase() {
  if (!isAtlasConfigured) {
    isDbConnected = false;
    return false;
  }

  // If already connected, reuse connection
  if ((mongoose.connection.readyState as number) === 1) {
    isDbConnected = true;
    return true;
  }

  // If currently connecting, wait for it to complete
  if ((mongoose.connection.readyState as number) === 2) {
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if ((mongoose.connection.readyState as number) !== 2) {
          clearInterval(interval);
          resolve((mongoose.connection.readyState as number) === 1);
        }
      }, 50);
      // Timeout after 4 seconds
      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
      }, 4000);
    });
    isDbConnected = (mongoose.connection.readyState as number) === 1;
    return isDbConnected;
  }

  try {
    console.log("Connecting to MongoDB Atlas...");
    
    // Register mongoose error event listener if not already done
    if (mongoose.connection.listeners("error").length === 0) {
      mongoose.connection.on("error", (err) => {
        console.error("Mongoose connection error event emitted:", err);
      });
    }

    await mongoose.connect(SANITIZED_MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    isDbConnected = true;
    console.log("MongoDB Connected successfully.");
    await seedDefaultDatabase();
    return true;
  } catch (error: any) {
    console.error("MongoDB Connection Failed:", error?.message || error);
    console.log("Falling back to local storage server_db_fallback.json. Setup MONGODB_URI to enable cloud database storage.");
    isDbConnected = false;
    return false;
  }
}

// Database Seeder
async function seedDefaultDatabase() {
  if (!isDbConnected) return;
  try {
    const defaultTenant = "tenant-pcs";
    
    // Seed default company if not existing
    const existingCompany = await Company.findOne({ tenantId: defaultTenant });
    if (!existingCompany) {
      await Company.create({
        tenantId: defaultTenant,
        name: "PCS Enterprises Pvt Ltd",
        gstin: "27AAAAA1111A1Z1",
        phone: "+91 9876543210",
        email: "contact@pcsconsultancy.com",
        address: "PCS Corporate Tower, Sector 15, CBD Belapur",
        state: "Maharashtra",
        stateCode: "27",
        bankName: "State Bank of India",
        accountNo: "12345678901",
        ifsc: "SBIN0001234",
        themeColor: "emerald",
        currencySymbol: "₹",
        currencyCode: "INR",
        businessType: "Retail"
      });
      console.log("Default company profile seeded in Mongo.");
    }

    // Seed default users if not existing
    const userCount = await User.countDocuments({ tenantId: defaultTenant });
    if (userCount === 0) {
      await User.create([
        {
          tenantId: defaultTenant,
          id: "user-1",
          username: "admin",
          passwordHash: hashPassword("admin"),
          role: "ADMIN",
          fullName: "System Admin"
        },
        {
          tenantId: defaultTenant,
          id: "user-2",
          username: "staff",
          passwordHash: hashPassword("staff"),
          role: "STAFF",
          fullName: "Billing Staff"
        }
      ]);
      console.log("Default ERP users (admin/staff) seeded in Mongo.");
    }
  } catch (err) {
    console.error("Error during database seeding:", err);
  }
}
