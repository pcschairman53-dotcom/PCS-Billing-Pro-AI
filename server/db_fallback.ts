import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "server_db_fallback.json");

// Simple custom hashing helper to match the frontend and server hashing
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

interface DbStructure {
  users: any[];
  companies: any[];
  categories: any[];
  products: any[];
  customers: any[];
  suppliers: any[];
  sales: any[];
  purchases: any[];
  expenses: any[];
  payments: any[];
  stockLogs: any[];
  activityLogs: any[];
}

function getInitialData(): DbStructure {
  const defaultTenant = "tenant-pcs";
  return {
    users: [
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
    ],
    companies: [
      {
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
      }
    ],
    categories: [],
    products: [],
    customers: [],
    suppliers: [],
    sales: [],
    purchases: [],
    expenses: [],
    payments: [],
    stockLogs: [],
    activityLogs: []
  };
}

export class JsonDb {
  private static read(): DbStructure {
    try {
      if (!fs.existsSync(FILE_PATH)) {
        const initial = getInitialData();
        fs.writeFileSync(FILE_PATH, JSON.stringify(initial, null, 2), "utf8");
        return initial;
      }
      const raw = fs.readFileSync(FILE_PATH, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading JSON fallback database:", e);
      return getInitialData();
    }
  }

  private static write(data: DbStructure) {
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Error writing to JSON fallback database:", e);
    }
  }

  // Auth Operations
  public static findUserByUsername(username: string) {
    const db = this.read();
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  public static createUser(user: any) {
    const db = this.read();
    db.users.push(user);
    this.write(db);
    return user;
  }

  public static createCompany(company: any) {
    const db = this.read();
    db.companies.push(company);
    this.write(db);
    return company;
  }

  // Get all data for a specific tenant
  public static getAllTenantData(tenantId: string) {
    const db = this.read();
    return {
      users: db.users.filter(x => x.tenantId === tenantId).map(({ passwordHash, ...u }) => u),
      company: db.companies.find(x => x.tenantId === tenantId) || {},
      categories: db.categories.filter(x => x.tenantId === tenantId),
      products: db.products.filter(x => x.tenantId === tenantId),
      customers: db.customers.filter(x => x.tenantId === tenantId),
      suppliers: db.suppliers.filter(x => x.tenantId === tenantId),
      sales: db.sales.filter(x => x.tenantId === tenantId),
      purchases: db.purchases.filter(x => x.tenantId === tenantId),
      expenses: db.expenses.filter(x => x.tenantId === tenantId),
      payments: db.payments.filter(x => x.tenantId === tenantId),
      stockLogs: db.stockLogs.filter(x => x.tenantId === tenantId),
      activityLogs: db.activityLogs.filter(x => x.tenantId === tenantId)
    };
  }

  // Bulk synchronization (Sync action)
  public static syncTenantData(tenantId: string, data: any) {
    const db = this.read();

    const collections: (keyof DbStructure)[] = [
      "categories", "products", "customers", "suppliers", 
      "sales", "purchases", "expenses", "payments", "stockLogs", "activityLogs"
    ];

    if (data.company) {
      const idx = db.companies.findIndex(x => x.tenantId === tenantId);
      const companyWithTenant = { ...data.company, tenantId };
      if (idx !== -1) {
        db.companies[idx] = companyWithTenant;
      } else {
        db.companies.push(companyWithTenant);
      }
    }

    for (const key of collections) {
      if (data[key] && Array.isArray(data[key])) {
        // Remove existing items of this tenant
        db[key] = db[key].filter(x => x.tenantId !== tenantId);
        // Add new items, stamping them with tenantId
        const newItems = (data[key] as any[]).map(item => ({ ...item, tenantId }));
        db[key].push(...newItems);
      }
    }

    this.write(db);
  }

  // Incremental modifications helper
  public static updateItem(collection: keyof DbStructure, tenantId: string, id: string, itemData: any) {
    const db = this.read();
    const idx = db[collection].findIndex(x => x.tenantId === tenantId && x.id === id);
    if (idx !== -1) {
      db[collection][idx] = { ...db[collection][idx], ...itemData, tenantId, id };
    } else {
      db[collection].push({ ...itemData, tenantId, id });
    }
    this.write(db);
  }

  public static createItem(collection: keyof DbStructure, tenantId: string, itemData: any) {
    const db = this.read();
    db[collection].push({ ...itemData, tenantId });
    this.write(db);
  }

  public static deleteItem(collection: keyof DbStructure, tenantId: string, id: string) {
    const db = this.read();
    db[collection] = db[collection].filter(x => !(x.tenantId === tenantId && x.id === id));
    this.write(db);
  }

  public static updateCompany(tenantId: string, companyData: any) {
    const db = this.read();
    const idx = db.companies.findIndex(x => x.tenantId === tenantId);
    if (idx !== -1) {
      db.companies[idx] = { ...db.companies[idx], ...companyData, tenantId };
    } else {
      db.companies.push({ ...companyData, tenantId });
    }
    this.write(db);
  }
}
