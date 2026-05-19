import * as SQLite from "expo-sqlite";
import { logError } from "./logger";

// Types
export interface Client {
  client_id?: number;
  client_name: string;
  client_phone?: string;
  created_at?: string;
}

export interface Product {
  product_id?: number;
  product_name: string;
  product_rate: number;
  created_at?: string;
}

export interface PresetParticular {
  preset_particular_id?: number;
  preset_id: number;
  product_id: number;
  quantity: number;
  created_at?: string;
}

export interface Preset {
  preset_id?: number;
  preset_name: string;
  created_at?: string;
}

export interface PresetWithProducts extends Preset {
  particulars: Array<{
    preset_particular_id: number;
    product_id: number;
    product_name: string;
    product_rate: number;
    quantity: string;
  }>;
}

export interface BusinessInfo {
  id?: number;
  phone_number?: string;
  business_name?: string;
  business_addr?: string;
  gstin?: string;
}

// Bill particulars: [particular_name, rate, quantity]
export type BillParticular = [string, number, number];

export interface Bill {
  bill_id?: number;
  client_name: string;
  client_phone?: string;
  date_issued?: string;
  total_amount: number;
  discount: number;
  bill_particulars: string; // JSON string of BillParticular[]
}

// Database instance
let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

// Initialize database
export const initDatabase = async (): Promise<void> => {
  // Prevent multiple simultaneous initializations
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  if (db) {
    return;
  }

  isInitializing = true;

  initializationPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync("business.db");
      await db.execAsync(`
      PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
      
      CREATE TABLE IF NOT EXISTS clients (
        client_id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        client_phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        product_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        product_rate REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS presets (
        preset_id INTEGER PRIMARY KEY AUTOINCREMENT,
        preset_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS preset_particulars (
        preset_particular_id INTEGER PRIMARY KEY AUTOINCREMENT,
        preset_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (preset_id) REFERENCES presets(preset_id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS business_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT,
        business_name TEXT,
        business_addr TEXT,
        gstin TEXT
      );

      CREATE TABLE IF NOT EXISTS bills (
        bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_name TEXT NOT NULL,
        client_phone TEXT,
        date_issued DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_amount REAL NOT NULL,
        discount REAL DEFAULT 0,
        bill_particulars TEXT NOT NULL
      );
    `);
      console.log("Database initialized successfully");
    } catch (error) {
      logError("DATABASE", "Failed to initialize database", error);
      console.error("Error initializing database:", error);
      db = null;
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
};

// Get database instance with auto-reconnect
const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    await initDatabase();
  }

  if (!db) {
    const error = new Error(
      "Database not initialized. Call initDatabase first."
    );
    logError("DATABASE", "Database access failed", error);
    throw error;
  }

  return db;
};

// Wrapper for database operations with error handling and retry
const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  retries = 2
): Promise<T> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      logError(
        "DATABASE",
        `${operationName} failed (attempt ${attempt + 1}/${retries + 1})`,
        error
      );

      // Check if it's a connection issue
      if (
        error?.message?.includes("database") ||
        error?.message?.includes("connection") ||
        error?.message?.includes("closed")
      ) {
        db = null; // Force reinitialization

        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * (attempt + 1))
          ); // Exponential backoff
          continue;
        }
      }

      throw error;
    }
  }
  throw new Error(`${operationName} failed after ${retries + 1} attempts`);
};

// ============= CLIENTS =============

export const insertClient = async (client: Client): Promise<number> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.runAsync(
      "INSERT INTO clients (client_name, client_phone) VALUES (?, ?)",
      [client.client_name, client.client_phone || null]
    );
    return result.lastInsertRowId;
  }, "insertClient");
};

export const getAllClients = async (): Promise<Client[]> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getAllAsync<Client>(
      "SELECT * FROM clients ORDER BY created_at DESC"
    );
    return result;
  }, "getAllClients");
};

export const getClientById = async (id: number): Promise<Client | null> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getFirstAsync<Client>(
      "SELECT * FROM clients WHERE client_id = ?",
      [id]
    );
    return result;
  }, "getClientById");
};

export const updateClient = async (
  id: number,
  client: Partial<Client>
): Promise<void> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    await database.runAsync(
      "UPDATE clients SET client_name = ?, client_phone = ? WHERE client_id = ?",
      [client.client_name!, client.client_phone || null, id]
    );
  }, "updateClient");
};

export const deleteClient = async (id: number): Promise<void> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    await database.runAsync("DELETE FROM clients WHERE client_id = ?", [id]);
  }, "deleteClient");
};

export const searchClients = async (query: string): Promise<Client[]> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getAllAsync<Client>(
      "SELECT * FROM clients WHERE client_name LIKE ? OR client_phone LIKE ? ORDER BY created_at DESC",
      [`%${query}%`, `%${query}%`]
    );
    return result;
  }, "searchClient");
};

// ============= PRODUCTS =============

export const insertProduct = async (product: Product): Promise<number> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.runAsync(
      "INSERT INTO products (product_name, product_rate) VALUES (?, ?)",
      [product.product_name, product.product_rate]
    );
    return result.lastInsertRowId;
  }, "insertProduct");
};

export const getAllProducts = async (): Promise<Product[]> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getAllAsync<Product>(
      "SELECT * FROM products ORDER BY created_at DESC"
    );
    return result;
  }, "getAllProducts");
};

export const getProductById = async (id: number): Promise<Product | null> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getFirstAsync<Product>(
      "SELECT * FROM products WHERE product_id = ?",
      [id]
    );
    return result;
  }, "getProductById");
};

export const updateProduct = async (
  id: number,
  product: Partial<Product>
): Promise<void> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    await database.runAsync(
      "UPDATE products SET product_name = ?, product_rate = ? WHERE product_id = ?",
      [product.product_name!, product.product_rate!, id]
    );
  }, "updateProduct");
};

export const deleteProduct = async (id: number): Promise<void> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    await database.runAsync("DELETE FROM products WHERE product_id = ?", [id]);
  }, "deleteProduct");
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getAllAsync<Product>(
      "SELECT * FROM products WHERE product_name LIKE ? ORDER BY created_at DESC",
      [`%${query}%`]
    );
    return result;
  }, "searchProducts");
};

// ============= PRESETS =============

export const insertPreset = async (
  presetName: string,
  particulars: Array<{ product_id: number; quantity: string }>
): Promise<number> => {
  return executeWithRetry(async () => {
    const database = await getDb();

    // Insert preset
    const result = await database.runAsync(
      "INSERT INTO presets (preset_name) VALUES (?)",
      [presetName]
    );
    const presetId = result.lastInsertRowId;

    // Insert particulars
    for (const particular of particulars) {
      await database.runAsync(
        "INSERT INTO preset_particulars (preset_id, product_id, quantity) VALUES (?, ?, ?)",
        [presetId, particular.product_id, parseFloat(particular.quantity)]
      );
    }

    return presetId;
  }, "insertPreset");
};

export const getAllPresets = async (): Promise<Preset[]> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getAllAsync<Preset>(
      "SELECT * FROM presets ORDER BY created_at DESC"
    );
    return result;
  }, "getAllPresets");
};

export const getPresetById = async (
  id: number
): Promise<PresetWithProducts | null> => {
  return executeWithRetry(async () => {
    const database = await getDb();

    // Get preset
    const preset = await database.getFirstAsync<Preset>(
      "SELECT * FROM presets WHERE preset_id = ?",
      [id]
    );

    if (!preset) return null;

    // Get particulars with product details
    const particulars = await database.getAllAsync<any>(
      `SELECT 
      pp.preset_particular_id,
      pp.product_id,
      pp.quantity,
      p.product_name,
      p.product_rate
    FROM preset_particulars pp
    JOIN products p ON pp.product_id = p.product_id
    WHERE pp.preset_id = ?`,
      [id]
    );

    return {
      ...preset,
      particulars: particulars.map((particular) => ({
        ...particular,
        quantity: particular.quantity.toString(),
      })),
    };
  }, "getPresetById");
};

export const updatePreset = async (
  id: number,
  presetName: string,
  particulars: Array<{ product_id: number; quantity: string }>
): Promise<void> => {
  return executeWithRetry(async () => {
    const database = await getDb();

    // Update preset name
    await database.runAsync(
      "UPDATE presets SET preset_name = ? WHERE preset_id = ?",
      [presetName, id]
    );

    // Delete old particulars
    await database.runAsync(
      "DELETE FROM preset_particulars WHERE preset_id = ?",
      [id]
    );

    // Insert new particulars
    for (const particular of particulars) {
      await database.runAsync(
        "INSERT INTO preset_particulars (preset_id, product_id, quantity) VALUES (?, ?, ?)",
        [id, particular.product_id, parseFloat(particular.quantity)]
      );
    }
  }, "updatePreset");
};

export const deletePreset = async (id: number): Promise<void> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    // Particulars will be deleted automatically due to CASCADE
    await database.runAsync("DELETE FROM presets WHERE preset_id = ?", [id]);
  }, "deletePreset");
};

export const searchPresets = async (query: string): Promise<Preset[]> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getAllAsync<Preset>(
      "SELECT * FROM presets WHERE preset_name LIKE ? ORDER BY created_at DESC",
      [`%${query}%`]
    );
    return result;
  }, "searchPreset");
};

// ============= BUSINESS INFO =============

export const getBusinessInfo = async (): Promise<BusinessInfo | null> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getFirstAsync<BusinessInfo>(
      "SELECT * FROM business_info LIMIT 1"
    );
    return result;
  }, "getBusinessInfo");
};

export const upsertBusinessInfo = async (info: BusinessInfo): Promise<void> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const existing = await getBusinessInfo();

    if (existing) {
      await database.runAsync(
        "UPDATE business_info SET phone_number = ?, business_name = ?, business_addr = ?, gstin = ? WHERE id = ?",
        [
          info.phone_number || null,
          info.business_name || null,
          info.business_addr || null,
          info.gstin || null,
          existing.id!,
        ]
      );
    } else {
      await database.runAsync(
        "INSERT INTO business_info (phone_number, business_name, business_addr, gstin) VALUES (?, ?, ?, ?)",
        [
          info.phone_number || null,
          info.business_name || null,
          info.business_addr || null,
          info.gstin || null,
        ]
      );
    }
  }, "upsertBusinessInfo");
};

// ============= BILLS =============

export const insertBill = async (bill: Bill): Promise<number> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.runAsync(
      "INSERT INTO bills (client_name, client_phone, total_amount, discount, bill_particulars) VALUES (?, ?, ?, ?, ?)",
      [
        bill.client_name,
        bill.client_phone || null,
        bill.total_amount,
        bill.discount,
        bill.bill_particulars,
      ]
    );
    return result.lastInsertRowId;
  }, "insertBill");
};

export const getAllBills = async (): Promise<Bill[]> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getAllAsync<Bill>(
      "SELECT * FROM bills ORDER BY date_issued DESC"
    );
    return result;
  }, "getAllBills");
};

export const getBillById = async (id: number): Promise<Bill | null> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    const result = await database.getFirstAsync<Bill>(
      "SELECT * FROM bills WHERE bill_id = ?",
      [id]
    );
    return result;
  }, "getBillById");
};

export const deleteBill = async (id: number): Promise<void> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    await database.runAsync("DELETE FROM bills WHERE bill_id = ?", [id]);
  }, "deleteBill");
};

export const updateBill = async (
  id: number,
  bill: Partial<Bill>
): Promise<void> => {
  return executeWithRetry(async () => {
    const database = await getDb();
    await database.runAsync(
      "UPDATE bills SET client_name = ?, client_phone = ?, total_amount = ?, discount = ?, bill_particulars = ? WHERE bill_id = ?",
      [
        bill.client_name!,
        bill.client_phone || null,
        bill.total_amount!,
        bill.discount!,
        bill.bill_particulars!,
        id,
      ]
    );
  }, "updateBill");
};

export const searchBills = async (query: string): Promise<Bill[]> => {
  return executeWithRetry(async () => {
    const database = await getDb();

    const result = await database.getAllAsync<Bill>(
      "SELECT * FROM bills WHERE client_name LIKE ? OR client_phone LIKE ? ORDER BY date_issued DESC",
      [`%${query}%`, `%${query}%`]
    );
    return result;
  }, "searchBills");
};
