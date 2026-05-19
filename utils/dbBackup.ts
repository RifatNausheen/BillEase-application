import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import {
  Bill,
  BusinessInfo,
  Client,
  getAllBills,
  getAllClients,
  getAllPresets,
  getAllProducts,
  getBusinessInfo,
  getPresetById,
  insertBill,
  insertClient,
  insertPreset,
  insertProduct,
  Product,
  upsertBusinessInfo,
} from "./database";

interface DatabaseBackup {
  version: string;
  exportDate: string;
  data: {
    businessInfo: BusinessInfo | null;
    clients: Client[];
    products: Product[];
    presets: Array<{
      preset_name: string;
      particulars: Array<{
        product_id: number;
        quantity: string;
      }>;
    }>;
    bills: Bill[];
  };
}

// Export database to JSON file
export const exportDatabase = async (): Promise<void> => {
  try {
    // Gather all data
    const [businessInfo, clients, products, presets, bills] = await Promise.all(
      [
        getBusinessInfo(),
        getAllClients(),
        getAllProducts(),
        getAllPresets(),
        getAllBills(),
      ]
    );

    // Get preset details
    const presetsWithDetails = await Promise.all(
      presets.map(async (preset) => {
        const details = await getPresetById(preset.preset_id!);
        return {
          preset_name: preset.preset_name,
          particulars: details!.particulars.map((p) => ({
            product_id: p.product_id,
            quantity: p.quantity,
          })),
        };
      })
    );

    // Create backup object
    const backup: DatabaseBackup = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      data: {
        businessInfo,
        clients,
        products,
        presets: presetsWithDetails,
        bills,
      },
    };

    // Convert to JSON
    const jsonString = JSON.stringify(backup, null, 2);

    // Create file path
    const fileName = `backup_${new Date().getTime()}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Write file
    await FileSystem.writeAsStringAsync(fileUri, jsonString);

    // Share file
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Export Database Backup",
        UTI: "public.json",
      });
    } else {
      Alert.alert("Success", `Backup saved to: ${fileName}`);
    }

    console.log("Database exported successfully");
  } catch (error) {
    console.error("Error exporting database:", error);
    throw error;
  }
};

// Import database from JSON file
export const importDatabase = async (): Promise<void> => {
  try {
    // Pick document
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    const fileUri = result.assets[0].uri;

    // Read file
    const jsonString = await FileSystem.readAsStringAsync(fileUri);
    const backup: DatabaseBackup = JSON.parse(jsonString);

    // Validate backup format
    if (!backup.version || !backup.data) {
      throw new Error("Invalid backup file format");
    }

    // Confirm import (this will overwrite existing data)
    return new Promise((resolve, reject) => {
      Alert.alert(
        "Import Database",
        "This operation will add following data. Are you sure?\n\n" +
          `Backup Date: ${new Date(backup.exportDate).toLocaleString()}\n` +
          `Clients: ${backup.data.clients.length}\n` +
          `Products: ${backup.data.products.length}\n` +
          `Presets: ${backup.data.presets.length}\n` +
          `Bills: ${backup.data.bills.length}`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => resolve(),
          },
          {
            text: "Import",
            style: "destructive",
            onPress: async () => {
              try {
                await restoreBackup(backup);
                Alert.alert("Success", "Database imported successfully");
                resolve();
              } catch (error) {
                reject(error);
              }
            },
          },
        ]
      );
    });
  } catch (error) {
    console.error("Error importing database:", error);
    throw error;
  }
};

// Restore backup data
const restoreBackup = async (backup: DatabaseBackup): Promise<void> => {
  try {
    // Note: In a real app, you'd want to clear existing data first
    // For now, we'll just insert new data

    // Restore business info
    if (backup.data.businessInfo) {
      await upsertBusinessInfo(backup.data.businessInfo);
    }

    // Restore clients
    for (const client of backup.data.clients) {
      await insertClient({
        client_name: client.client_name,
        client_phone: client.client_phone,
      });
    }

    // Restore products
    const productIdMap = new Map<number, number>(); // old_id -> new_id
    for (const product of backup.data.products) {
      const newId = await insertProduct({
        product_name: product.product_name,
        product_rate: product.product_rate,
      });
      if (product.product_id) {
        productIdMap.set(product.product_id, newId);
      }
    }

    // Restore presets
    for (const preset of backup.data.presets) {
      const particulars = preset.particulars.map((p) => ({
        product_id: productIdMap.get(p.product_id) || p.product_id,
        quantity: p.quantity,
      }));
      await insertPreset(preset.preset_name, particulars);
    }

    // Restore bills
    for (const bill of backup.data.bills) {
      await insertBill({
        client_name: bill.client_name,
        client_phone: bill.client_phone,
        total_amount: bill.total_amount,
        discount: bill.discount,
        bill_particulars: bill.bill_particulars,
      });
    }

    console.log("Backup restored successfully");
  } catch (error) {
    console.error("Error restoring backup:", error);
    throw error;
  }
};

// Get backup statistics
export const getBackupStats = async () => {
  try {
    const [clients, products, presets, bills] = await Promise.all([
      getAllClients(),
      getAllProducts(),
      getAllPresets(),
      getAllBills(),
    ]);

    return {
      clients: clients.length,
      products: products.length,
      presets: presets.length,
      bills: bills.length,
      total: clients.length + products.length + presets.length + bills.length,
    };
  } catch (error) {
    console.error("Error getting backup stats:", error);
    return null;
  }
};
