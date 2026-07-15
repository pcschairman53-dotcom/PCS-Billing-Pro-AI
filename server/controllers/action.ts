import { Request, Response } from "express";
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
} from "../models";
import { isDbConnected, hashPassword } from "../db";
import { JsonDb } from "../db_fallback";
import { authenticateUser } from "./auth";

// GET route handler (getAll)
export async function getAllData(req: Request, res: Response) {
  const { action, username, token } = req.query;

  if (action !== "getAll") {
    return res.status(400).json({ success: false, error: "Unsupported GET action." });
  }

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

    return res.json({
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
}

// POST route handler
export async function handleAction(req: Request, res: Response) {
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

    return res.json({ success: true, message: `Action '${action}' synchronized on MongoDB.` });
  } catch (error: any) {
    console.error(`Error processing action ${action} on MongoDB, trying JSON fallback:`, error);
    return handleFallbackAction();
  }
}
