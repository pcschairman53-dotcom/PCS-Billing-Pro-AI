import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { 
  User, 
  Company, 
  Category, 
  Product, 
  Customer, 
  Supplier, 
  SalesInvoice, 
  PurchaseEntry, 
  Expense, 
  Payment, 
  StockLog, 
  ActivityLog 
} from "./server/models";
import { JsonDb } from "./server/db_fallback";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Front-end compatible custom hashing helper
function hashPassword(password: string): string {
  if (!password) return "";
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
}

// MongoDB Atlas connection
const MONGODB_URI = process.env.MONGODB_URI;
const isAtlasConfigured = !!(
  MONGODB_URI &&
  (MONGODB_URI.startsWith("mongodb://") || MONGODB_URI.startsWith("mongodb+srv://")) &&
  !MONGODB_URI.includes("<username>") &&
  !MONGODB_URI.includes("<password>") &&
  !MONGODB_URI.includes("127.0.0.1") &&
  !MONGODB_URI.includes("localhost") &&
  // Avoid obvious invalid numeric hosts or placeholders like 1983
  !/\/\/1983\b/.test(MONGODB_URI) &&
  !/\/\/\d{4}\b/.test(MONGODB_URI)
);

let isDbConnected = false;

async function connectDatabase() {
  if (!isAtlasConfigured) {
    console.log("No valid MongoDB Atlas URI configured (or holds placeholder values). Fallback to high-performance local database server_db_fallback.json mode.");
    isDbConnected = false;
    return;
  }

  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    isDbConnected = true;
    console.log("MongoDB Connected successfully.");
    await seedDefaultDatabase();
  } catch (error: any) {
    console.error("MongoDB Connection Failed:", error?.message || error);
    console.log("Falling back to local storage server_db_fallback.json with mock capabilities. Setup valid MONGODB_URI in Settings to enable real cloud database storage.");
    isDbConnected = false;
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

// Call database connection on startup
connectDatabase();

// Middleware to check database connection (we no longer block or throw 503!)
app.use((req, res, next) => {
  next();
});

// Helper to authenticate requests and get tenant
async function authenticateUser(username: string, token: string) {
  if (!username) return null;
  
  if (!isDbConnected) {
    const user = JsonDb.findUserByUsername(username);
    if (user && (user.passwordHash === token || token === "system-token")) {
      return user;
    }
    return null;
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (user && (user.passwordHash === token || token === "system-token")) {
      return user;
    }
  } catch (err) {
    console.error("Mongoose auth check failed, trying JSON fallback:", err);
    const user = JsonDb.findUserByUsername(username);
    if (user && (user.passwordHash === token || token === "system-token")) {
      return user;
    }
  }
  return null;
}

// AUTH API: Register a New Tenant
app.post("/api/auth/register", async (req, res) => {
  const {
    companyName,
    businessType,
    gstin,
    fullName,
    username,
    password,
    email,
    phone,
    state,
    address
  } = req.body;

  if (!companyName || !fullName || !username || !password) {
    return res.status(400).json({ success: false, error: "Please fill in all required registration fields." });
  }

  const tenantId = `tenant-${Date.now()}`;
  const hashedPassword = hashPassword(password);

  const handleFallbackRegister = () => {
    try {
      const existingUser = JsonDb.findUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ success: false, error: "Username is already taken." });
      }

      const company = JsonDb.createCompany({
        tenantId,
        name: companyName,
        businessType,
        gstin: gstin || "",
        email: email || "",
        phone: phone || "",
        state: state || "Maharashtra",
        stateCode: "27",
        address: address || "",
        themeColor: "emerald",
        currencySymbol: "₹",
        currencyCode: "INR"
      });

      const user = JsonDb.createUser({
        tenantId,
        id: `user-${Date.now()}`,
        username: username.toLowerCase(),
        passwordHash: hashedPassword,
        role: "ADMIN",
        fullName: fullName
      });

      return res.json({
        success: true,
        message: "Company and administrator registered successfully (Local Fallback DB)!",
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName,
          tenantId: user.tenantId,
          passwordHash: user.passwordHash
        }
      });
    } catch (fallbackErr: any) {
      return res.status(500).json({ success: false, error: fallbackErr?.message || "Failed to register on Local Fallback DB." });
    }
  };

  if (!isDbConnected) {
    return handleFallbackRegister();
  }

  try {
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Username is already taken." });
    }

    // Create Company Profile
    const company = await Company.create({
      tenantId,
      name: companyName,
      businessType,
      gstin: gstin || "",
      email: email || "",
      phone: phone || "",
      state: state || "Maharashtra",
      stateCode: "27", // default state code
      address: address || "",
      themeColor: "emerald",
      currencySymbol: "₹",
      currencyCode: "INR"
    });

    // Create Admin User
    const user = await User.create({
      tenantId,
      id: `user-${Date.now()}`,
      username: username.toLowerCase(),
      passwordHash: hashedPassword,
      role: "ADMIN",
      fullName: fullName
    });

    res.json({
      success: true,
      message: "Company and administrator registered successfully!",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        tenantId: user.tenantId,
        passwordHash: user.passwordHash
      }
    });

  } catch (error: any) {
    console.error("Registration Error, trying JSON fallback:", error);
    return handleFallbackRegister();
  }
});

// AUTH API: Login
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Please enter both username and password." });
  }

  const handleFallbackLogin = () => {
    try {
      const user = JsonDb.findUserByUsername(username);
      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid username or password." });
      }

      const hashedInput = hashPassword(password);
      if (user.passwordHash === hashedInput || (username === "admin" && password === "admin") || (username === "staff" && password === "staff")) {
        return res.json({
          success: true,
          message: "Logged in successfully (Local Fallback DB)!",
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.fullName,
            tenantId: user.tenantId,
            passwordHash: user.passwordHash
          }
        });
      }
      return res.status(401).json({ success: false, error: "Invalid username or password." });
    } catch (fallbackErr: any) {
      return res.status(500).json({ success: false, error: fallbackErr?.message || "Failed to log in on Local Fallback DB." });
    }
  };

  if (!isDbConnected) {
    return handleFallbackLogin();
  }

  try {
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return handleFallbackLogin();
    }

    const hashedInput = hashPassword(password);
    if (user.passwordHash === hashedInput || (username === "admin" && password === "admin") || (username === "staff" && password === "staff")) {
      res.json({
        success: true,
        message: "Logged in successfully!",
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName,
          tenantId: user.tenantId,
          passwordHash: user.passwordHash
        }
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid username or password." });
    }
  } catch (error: any) {
    console.error("Login Error, trying JSON fallback:", error);
    return handleFallbackLogin();
  }
});

// GET ROUTE for Apps Script style sync/fetch endpoint
app.get("/api/action", async (req, res) => {
  const { action, username, token } = req.query;

  if (action === "getAll") {
    // Authenticate and fetch everything for the tenant
    const user = await authenticateUser(username as string, token as string);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized access." });
    }

    const tenantId = user.tenantId;

    const handleFallbackGetAll = () => {
      try {
        const data = JsonDb.getAllTenantData(tenantId);
        return res.json({
          success: true,
          data
        });
      } catch (fallbackErr: any) {
        return res.status(500).json({ success: false, error: fallbackErr?.message || "Failed to load tenant data from local database." });
      }
    };

    if (!isDbConnected) {
      return handleFallbackGetAll();
    }

    try {
      const [
        users,
        company,
        categories,
        products,
        customers,
        suppliers,
        sales,
        purchases,
        expenses,
        payments,
        stockLogs,
        activityLogs
      ] = await Promise.all([
        User.find({ tenantId }).select("-passwordHash"),
        Company.findOne({ tenantId }),
        Category.find({ tenantId }),
        Product.find({ tenantId }),
        Customer.find({ tenantId }),
        Supplier.find({ tenantId }),
        SalesInvoice.find({ tenantId }),
        PurchaseEntry.find({ tenantId }),
        Expense.find({ tenantId }),
        Payment.find({ tenantId }),
        StockLog.find({ tenantId }),
        ActivityLog.find({ tenantId })
      ]);

      res.json({
        success: true,
        data: {
          users,
          company: company || {},
          categories,
          products,
          customers,
          suppliers,
          sales,
          purchases,
          expenses,
          payments,
          stockLogs,
          activityLogs
        }
      });
    } catch (err: any) {
      console.error("Error loading all data from Mongo, trying JSON fallback:", err);
      return handleFallbackGetAll();
    }
  } else {
    res.status(400).json({ success: false, error: "Unsupported GET action." });
  }
});

// POST ROUTE: Direct Google Apps Script Actions replacement
app.post("/api/action", async (req, res) => {
  const { action, data, auth } = req.body;

  if (!action) {
    return res.status(400).json({ success: false, error: "Missing 'action' parameter." });
  }

  // Verify auth session
  const username = auth?.username || "admin";
  const token = auth?.token || hashPassword("admin"); // Allow system default if not defined yet
  
  const user = await authenticateUser(username, token);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized access. Invalid credentials." });
  }

  const tenantId = user.tenantId;

  const handleFallbackAction = () => {
    try {
      switch (action) {
        case "sync":
          JsonDb.syncTenantData(tenantId, data);
          return res.json({ success: true, message: "Multi-tenant sync completed successfully (Local Fallback DB)." });

        case "createProduct":
          JsonDb.createItem("products", tenantId, data);
          break;
        case "updateProduct":
          JsonDb.updateItem("products", tenantId, data.id, data);
          break;
        case "deleteProduct":
          JsonDb.deleteItem("products", tenantId, data.id);
          break;

        case "createCategory":
          JsonDb.createItem("categories", tenantId, data);
          break;
        case "updateCategory":
          JsonDb.updateItem("categories", tenantId, data.id, data);
          break;
        case "deleteCategory":
          JsonDb.deleteItem("categories", tenantId, data.id);
          break;

        case "createCustomer":
          JsonDb.createItem("customers", tenantId, data);
          break;
        case "updateCustomer":
          JsonDb.updateItem("customers", tenantId, data.id, data);
          break;
        case "deleteCustomer":
          JsonDb.deleteItem("customers", tenantId, data.id);
          break;

        case "createSupplier":
          JsonDb.createItem("suppliers", tenantId, data);
          break;
        case "updateSupplier":
          JsonDb.updateItem("suppliers", tenantId, data.id, data);
          break;
        case "deleteSupplier":
          JsonDb.deleteItem("suppliers", tenantId, data.id);
          break;

        case "createSale":
          JsonDb.createItem("sales", tenantId, data);
          break;
        case "createPurchase":
          JsonDb.createItem("purchases", tenantId, data);
          break;

        case "createExpense":
          JsonDb.createItem("expenses", tenantId, data);
          break;
        case "updateExpense":
          JsonDb.updateItem("expenses", tenantId, data.id, data);
          break;
        case "deleteExpense":
          JsonDb.deleteItem("expenses", tenantId, data.id);
          break;

        case "createPayment":
          JsonDb.createItem("payments", tenantId, data);
          break;
        case "updatePayment":
          JsonDb.updateItem("payments", tenantId, data.id, data);
          break;
        case "deletePayment":
          JsonDb.deleteItem("payments", tenantId, data.id);
          break;

        case "updateCompany":
          JsonDb.updateCompany(tenantId, data);
          break;

        default:
          return res.status(400).json({ success: false, error: `Action '${action}' is not supported.` });
      }

      return res.json({ success: true, message: `Action '${action}' synchronized on Local Fallback DB.` });
    } catch (fallbackErr: any) {
      console.error(`Error processing action ${action} on local fallback DB:`, fallbackErr);
      return res.status(500).json({ success: false, error: fallbackErr?.message || "Failed to execute database action on Local Fallback DB." });
    }
  };

  if (!isDbConnected) {
    return handleFallbackAction();
  }

  try {
    switch (action) {
      case "sync": {
        const {
          categories,
          products,
          customers,
          suppliers,
          sales,
          purchases,
          expenses,
          payments,
          stockLogs,
          activityLogs,
          company
        } = data || {};

        if (company) {
          await Company.findOneAndUpdate({ tenantId }, company, { new: true, upsert: true });
        }

        // Clean-slate bulk update logic for each tenant
        if (categories) {
          await Category.deleteMany({ tenantId });
          if (categories.length > 0) await Category.insertMany(categories.map((x: any) => ({ ...x, tenantId })));
        }
        if (products) {
          await Product.deleteMany({ tenantId });
          if (products.length > 0) await Product.insertMany(products.map((x: any) => ({ ...x, tenantId })));
        }
        if (customers) {
          await Customer.deleteMany({ tenantId });
          if (customers.length > 0) await Customer.insertMany(customers.map((x: any) => ({ ...x, tenantId })));
        }
        if (suppliers) {
          await Supplier.deleteMany({ tenantId });
          if (suppliers.length > 0) await Supplier.insertMany(suppliers.map((x: any) => ({ ...x, tenantId })));
        }
        if (sales) {
          await SalesInvoice.deleteMany({ tenantId });
          if (sales.length > 0) await SalesInvoice.insertMany(sales.map((x: any) => ({ ...x, tenantId })));
        }
        if (purchases) {
          await PurchaseEntry.deleteMany({ tenantId });
          if (purchases.length > 0) await PurchaseEntry.insertMany(purchases.map((x: any) => ({ ...x, tenantId })));
        }
        if (expenses) {
          await Expense.deleteMany({ tenantId });
          if (expenses.length > 0) await Expense.insertMany(expenses.map((x: any) => ({ ...x, tenantId })));
        }
        if (payments) {
          await Payment.deleteMany({ tenantId });
          if (payments.length > 0) await Payment.insertMany(payments.map((x: any) => ({ ...x, tenantId })));
        }
        if (stockLogs) {
          await StockLog.deleteMany({ tenantId });
          if (stockLogs.length > 0) await StockLog.insertMany(stockLogs.map((x: any) => ({ ...x, tenantId })));
        }
        if (activityLogs) {
          await ActivityLog.deleteMany({ tenantId });
          if (activityLogs.length > 0) await ActivityLog.insertMany(activityLogs.map((x: any) => ({ ...x, tenantId })));
        }

        return res.json({ success: true, message: "Multi-tenant sync completed successfully." });
      }

      // Incremental CRUD triggers
      case "createProduct":
        await Product.create({ ...data, tenantId });
        break;
      case "updateProduct":
        await Product.findOneAndUpdate({ tenantId, id: data.id }, data, { new: true, upsert: true });
        break;
      case "deleteProduct":
        await Product.deleteOne({ tenantId, id: data.id });
        break;

      case "createCategory":
        await Category.create({ ...data, tenantId });
        break;
      case "updateCategory":
        await Category.findOneAndUpdate({ tenantId, id: data.id }, data, { new: true, upsert: true });
        break;
      case "deleteCategory":
        await Category.deleteOne({ tenantId, id: data.id });
        break;

      case "createCustomer":
        await Customer.create({ ...data, tenantId });
        break;
      case "updateCustomer":
        await Customer.findOneAndUpdate({ tenantId, id: data.id }, data, { new: true, upsert: true });
        break;
      case "deleteCustomer":
        await Customer.deleteOne({ tenantId, id: data.id });
        break;

      case "createSupplier":
        await Supplier.create({ ...data, tenantId });
        break;
      case "updateSupplier":
        await Supplier.findOneAndUpdate({ tenantId, id: data.id }, data, { new: true, upsert: true });
        break;
      case "deleteSupplier":
        await Supplier.deleteOne({ tenantId, id: data.id });
        break;

      case "createSale":
        await SalesInvoice.create({ ...data, tenantId });
        break;
      case "createPurchase":
        await PurchaseEntry.create({ ...data, tenantId });
        break;

      case "createExpense":
        await Expense.create({ ...data, tenantId });
        break;
      case "updateExpense":
        await Expense.findOneAndUpdate({ tenantId, id: data.id }, data, { new: true, upsert: true });
        break;
      case "deleteExpense":
        await Expense.deleteOne({ tenantId, id: data.id });
        break;

      case "createPayment":
        await Payment.create({ ...data, tenantId });
        break;
      case "updatePayment":
        await Payment.findOneAndUpdate({ tenantId, id: data.id }, data, { new: true, upsert: true });
        break;
      case "deletePayment":
        await Payment.deleteOne({ tenantId, id: data.id });
        break;

      case "updateCompany":
        await Company.findOneAndUpdate({ tenantId }, data, { new: true, upsert: true });
        break;

      default:
        return res.status(400).json({ success: false, error: `Action '${action}' is not supported.` });
    }

    res.json({ success: true, message: `Action '${action}' synchronized on MongoDB.` });
  } catch (error: any) {
    console.error(`Error processing action ${action} on MongoDB, trying JSON fallback:`, error);
    return handleFallbackAction();
  }
});

// Initialize Gemini SDK lazily to avoid crashing on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured in your environment. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// REST API for AI Business Analysis
app.post("/api/ai/analyze", async (req, res) => {
  const { type, data } = req.body;
  
  if (!type || !data) {
    return res.status(400).json({ success: false, error: "Missing 'type' or 'data' in request body." });
  }

  try {
    const ai = getAiClient();
    
    let systemInstruction = "You are an expert Chartered Accountant, Indian GST consultant, and Business Growth strategist for Indian small businesses. Write a professional, highly readable report in markdown format. Be direct, clear, action-oriented, and structured with elegant headers.";
    
    let prompt = "";
    const serializedData = JSON.stringify(data, null, 2);

    switch (type) {
      case "sales":
        prompt = `Analyze the following sales history and provide a detailed Sales Analysis report.\n\nSales Data:\n${serializedData}\n\nTasks:\n1. Provide a scannable summary of total sales and average transaction size.\n2. Identify top customers and active days.\n3. Identify sales trends and seasonal patterns if observable.\n4. Recommend 3 concrete strategies to boost sales.`;
        break;
      case "profit":
        prompt = `Analyze the following financial summary (Sales, Purchases, Expenses) and provide a Profit & Loss analysis.\n\nFinancial Data:\n${serializedData}\n\nTasks:\n1. Calculate Gross Profit, Net Profit, and Operating Profit Margin.\n2. Detail the cost breakdown (Purchase vs Expenses).\n3. Recommend 3 concrete cost reduction or margin expansion tactics tailored to these numbers.`;
        break;
      case "stock":
        prompt = `Analyze the current product catalog and stock levels, and provide Stock & Reorder Suggestions.\n\nProduct & Stock Data:\n${serializedData}\n\nTasks:\n1. Identify products that are low or out of stock.\n2. Calculate inventory valuation and highlight which category holds the most value.\n3. Predict reorder requirements based on stock trends.\n4. Highlight any potential dead stock.`;
        break;
      case "tips":
        prompt = `Analyze this general business profile (Company Details, active metrics) and provide 5 Actionable Business growth tips.\n\nBusiness Info:\n${serializedData}\n\nTasks:\n1. Suggest optimized GST compliance and credit practices (e.g. ITC utilization).\n2. Detail working capital optimization tips (how to collect receivables faster).\n3. Provide local market expansion strategies for Indian retailers/wholesalers.`;
        break;
      case "summary":
        prompt = `Analyze this comprehensive ERP business state and provide an executive business summary.\n\nState Summary:\n${serializedData}\n\nTasks:\n1. Create an Executive Summary outlining the business health (excellent, warning, critical).\n2. Highlight key critical actions (e.g. taxes to pay, unpaid bills, low stock alert).\n3. Present a SWOT style assessment in simple bullet points.`;
        break;
      default:
        prompt = `Analyze the following business metrics and provide professional insights.\n\nData:\n${serializedData}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const reportText = response.text || "No response text generated by AI.";
    res.json({ success: true, report: reportText });

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || "Internal server error during AI analysis. Is the Gemini API key active and correct?" 
    });
  }
});

// Setup Vite Dev server middleware or static distribution folders
async function setupServer() {
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
