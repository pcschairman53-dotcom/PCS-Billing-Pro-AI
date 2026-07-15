import mongoose, { Schema } from "mongoose";

// We use string IDs to remain 100% compatible with the frontend's generated UUID-like strings (e.g. 'user-1', UUIDs etc.)
// Thus, every document has an `id` string field which we index.

const UserSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["ADMIN", "STAFF"], default: "ADMIN" },
  fullName: { type: String, required: true },
}, { timestamps: true });

// Ensure unique username per tenant
UserSchema.index({ tenantId: 1, username: 1 }, { unique: true });

const CompanySchema = new Schema({
  tenantId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  gstin: { type: String, default: "" },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  address: { type: String, default: "" },
  state: { type: String, default: "" },
  stateCode: { type: String, default: "" },
  bankName: { type: String, default: "" },
  accountNo: { type: String, default: "" },
  ifsc: { type: String, default: "" },
  logoUrl: { type: String, default: "" },
  qrCodeData: { type: String, default: "" },
  invoiceHeader: { type: String, default: "" },
  invoiceFooter: { type: String, default: "" },
  themeColor: { type: String, default: "emerald" },
  currencySymbol: { type: String, default: "₹" },
  currencyCode: { type: String, default: "INR" },
  businessType: { type: String, default: "Retail" },
  subscriptionPlan: { type: String, enum: ["Free", "Monthly", "Yearly"], default: "Free" },
  subscriptionStatus: { type: String, enum: ["Active", "Suspended", "Expired"], default: "Active" }
}, { timestamps: true });

const CategorySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: "" }
}, { timestamps: true });

CategorySchema.index({ tenantId: 1, id: 1 }, { unique: true });

const ProductSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  sku: { type: String, default: "" },
  categoryId: { type: String, default: "" },
  description: { type: String, default: "" },
  hsnCode: { type: String, default: "" },
  gstRate: { type: Number, default: 18 },
  salesPrice: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  minStockAlert: { type: Number, default: 5 },
  initialStock: { type: Number, default: 0 }
}, { timestamps: true });

ProductSchema.index({ tenantId: 1, id: 1 }, { unique: true });

const CustomerSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  gstin: { type: String, default: "" },
  address: { type: String, default: "" },
  state: { type: String, default: "" },
  stateCode: { type: String, default: "" },
  balance: { type: Number, default: 0 }
}, { timestamps: true });

CustomerSchema.index({ tenantId: 1, id: 1 }, { unique: true });

const SupplierSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, default: "" },
  email: { type: String, default: "" },
  gstin: { type: String, default: "" },
  address: { type: String, default: "" },
  state: { type: String, default: "" },
  stateCode: { type: String, default: "" },
  balance: { type: Number, default: 0 }
}, { timestamps: true });

SupplierSchema.index({ tenantId: 1, id: 1 }, { unique: true });

const InvoiceItemSchema = new Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  hsnCode: { type: String, default: "" },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  gstRate: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  subTotal: { type: Number, required: true },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  total: { type: Number, required: true }
});

const SalesInvoiceSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  invoiceNumber: { type: String, required: true },
  date: { type: String, required: true },
  customerId: { type: String, required: true },
  items: [InvoiceItemSchema],
  subTotal: { type: Number, required: true },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["Paid", "Unpaid", "Partial"], default: "Unpaid" },
  paymentMethod: { type: String, default: "Cash" },
  amountPaid: { type: Number, default: 0 },
  notes: { type: String, default: "" }
}, { timestamps: true });

SalesInvoiceSchema.index({ tenantId: 1, id: 1 }, { unique: true });

const PurchaseItemSchema = new Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  hsnCode: { type: String, default: "" },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  gstRate: { type: Number, default: 0 },
  subTotal: { type: Number, required: true },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  total: { type: Number, required: true }
});

const PurchaseEntrySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  billNumber: { type: String, required: true },
  date: { type: String, required: true },
  supplierId: { type: String, required: true },
  items: [PurchaseItemSchema],
  subTotal: { type: Number, required: true },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  igstTotal: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["Paid", "Unpaid", "Partial"], default: "Unpaid" },
  amountPaid: { type: Number, default: 0 },
  notes: { type: String, default: "" }
}, { timestamps: true });

PurchaseEntrySchema.index({ tenantId: 1, id: 1 }, { unique: true });

const ExpenseSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  description: { type: String, default: "" },
  reference: { type: String, default: "" }
}, { timestamps: true });

ExpenseSchema.index({ tenantId: 1, id: 1 }, { unique: true });

const PaymentSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  type: { type: String, enum: ["Inflow", "Outflow"], required: true },
  date: { type: String, required: true },
  partyId: { type: String, required: true },
  partyName: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ["Cash", "Bank Transfer", "UPI", "Cheque"], default: "Cash" },
  reference: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });

PaymentSchema.index({ tenantId: 1, id: 1 }, { unique: true });

const StockLogSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  productId: { type: String, required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ["Addition", "Reduction", "Adjustment"], required: true },
  quantity: { type: Number, required: true },
  referenceId: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });

StockLogSchema.index({ tenantId: 1, id: 1 }, { unique: true });

const ActivityLogSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, default: "" },
  timestamp: { type: String, required: true }
}, { timestamps: true });

ActivityLogSchema.index({ tenantId: 1, id: 1 }, { unique: true });

export const User: any = mongoose.models.User || mongoose.model("User", UserSchema);
export const Company: any = mongoose.models.Company || mongoose.model("Company", CompanySchema);
export const Category: any = mongoose.models.Category || mongoose.model("Category", CategorySchema);
export const Product: any = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export const Customer: any = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
export const Supplier: any = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
export const SalesInvoice: any = mongoose.models.SalesInvoice || mongoose.model("SalesInvoice", SalesInvoiceSchema);
export const PurchaseEntry: any = mongoose.models.PurchaseEntry || mongoose.model("PurchaseEntry", PurchaseEntrySchema);
export const Expense: any = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
export const Payment: any = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export const StockLog: any = mongoose.models.StockLog || mongoose.model("StockLog", StockLogSchema);
export const ActivityLog: any = mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema);
