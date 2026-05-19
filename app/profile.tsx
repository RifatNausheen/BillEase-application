import { hexToRGBA } from "@/utils/misc";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BusinessInfo,
  getBusinessInfo,
  upsertBusinessInfo,
} from "../utils/database";
import {
  exportDatabase,
  getBackupStats,
  importDatabase,
} from "../utils/dbBackup";

export default function ProfileScreen() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gstin, setGstin] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [backupStats, setBackupStats] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { colors } = useTheme();

  const styles = createStyles(colors);

  useEffect(() => {
    loadBusinessInfo();
    loadBackupStats();
  }, []);

  const loadBackupStats = async () => {
    const stats = await getBackupStats();
    setBackupStats(stats);
  };

  const loadBusinessInfo = async () => {
    try {
      const info = await getBusinessInfo();
      if (info) {
        setBusinessName(info.business_name || "");
        setAddress(info.business_addr || "");
        setPhoneNumber(info.phone_number || "");
        setGstin(info.gstin || "");
      }
    } catch (error) {
      console.error("Error loading business info:", error);
      ToastAndroid.show(
        "Failed to load business information",
        ToastAndroid.SHORT
      );
      //   Alert.alert('Error', 'Failed to load business information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const info: BusinessInfo = {
        business_name: businessName,
        business_addr: address,
        phone_number: phoneNumber,
        gstin: gstin,
      };

      await upsertBusinessInfo(info);
      setIsEditing(false);
      ToastAndroid.show("Business information saved", ToastAndroid.LONG);
      //   Alert.alert('Success', 'Business information saved successfully');
    } catch (error) {
      console.error("Error saving business info:", error);
      ToastAndroid.show(
        "Failed to save business information",
        ToastAndroid.SHORT
      );
      //   Alert.alert('Error', 'Failed to save business information');
    }
  };

  const handleExportDatabase = async () => {
    try {
      setIsExporting(true);
      await exportDatabase();
    } catch (error) {
      console.error("Error exporting database:", error);
      ToastAndroid.show("Failed to export database", ToastAndroid.LONG);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = async () => {
    try {
      setIsImporting(true);
      await importDatabase();
      // Reload data after import
      await loadBusinessInfo();
      await loadBackupStats();
    } catch (error) {
      console.error("Error importing database:", error);
      ToastAndroid.show("Failed to import database", ToastAndroid.LONG);
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Profile</Text>
        <TouchableOpacity
          onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? "Save" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Ionicons name="business" size={60} color="#007AFF" />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Business Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Enter business name"
            editable={isEditing}
            placeholderTextColor={hexToRGBA(colors.text, 0.5)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              !isEditing && styles.inputDisabled,
            ]}
            value={address}
            onChangeText={setAddress}
            placeholder="Enter address"
            placeholderTextColor={hexToRGBA(colors.text, 0.5)}
            multiline
            numberOfLines={3}
            editable={isEditing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter phone number"
            placeholderTextColor={hexToRGBA(colors.text, 0.5)}
            keyboardType="phone-pad"
            editable={isEditing}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>GSTIN</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={gstin}
            onChangeText={setGstin}
            placeholder="Enter GSTIN"
            placeholderTextColor={hexToRGBA(colors.text, 0.5)}
            autoCapitalize="characters"
            editable={isEditing}
          />
        </View>

        {/* Backup/Restore Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Backup & Restore</Text>
          <Text style={styles.sectionDescription}>
            Export your data as a backup file or import from a previous backup
          </Text>

          {backupStats && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Current Data</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{backupStats.clients}</Text>
                  <Text style={styles.statLabel}>Clients</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{backupStats.products}</Text>
                  <Text style={styles.statLabel}>Products</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{backupStats.presets}</Text>
                  <Text style={styles.statLabel}>Presets</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{backupStats.bills}</Text>
                  <Text style={styles.statLabel}>Bills</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.backupButtons}>
            <TouchableOpacity
              style={[
                styles.backupButton,
                styles.exportButton,
                isExporting && styles.disabledButton,
              ]}
              onPress={handleExportDatabase}
              disabled={isExporting}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.backupButtonText}>
                {isExporting ? "Exporting..." : "Export Data"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.backupButton,
                styles.importButton,
                isImporting && styles.disabledButton,
              ]}
              onPress={handleImportDatabase}
              disabled={isImporting}
            >
              <Ionicons
                name="cloud-download-outline"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.backupButtonText}>
                {isImporting ? "Importing..." : "Import Data"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.warningCard}>
            <Ionicons name="warning-outline" size={20} color="#FF9500" />
            <Text style={styles.warningText}>
              Importing will add data to your existing database. Make sure to
              export a backup first.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: hexToRGBA(colors.text, 0.05),
    },
    centerContent: {
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 50,
      paddingBottom: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    editButton: {
      padding: 4,
    },
    editButtonText: {
      fontSize: 16,
      color: "#007AFF",
      fontWeight: "600",
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    avatarContainer: {
      alignItems: "center",
      marginBottom: 32,
    },
    avatarCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: hexToRGBA(colors.text, 0.1),
      justifyContent: "center",
      alignItems: "center",
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    inputDisabled: {
      backgroundColor: hexToRGBA(colors.text, 0.2),
      color: hexToRGBA(colors.text, 0.5),
    },
    textArea: {
      height: 80,
      textAlignVertical: "top",
    },
    section: {
      marginTop: 32,
      paddingTop: 24,
      borderTopWidth: 1,
      borderTopColor: hexToRGBA(colors.text, 0.15),
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    sectionDescription: {
      fontSize: 14,
      color: hexToRGBA(colors.text, 0.5),
      marginBottom: 16,
    },
    statsCard: {
      backgroundColor: hexToRGBA(colors.text, 0.1),
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    statsTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#007AFF",
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: hexToRGBA(colors.text, 0.5),
    },
    backupButtons: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    backupButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 16,
      borderRadius: 10,
    },
    exportButton: {
      backgroundColor: "#34C759",
    },
    importButton: {
      backgroundColor: "#007AFF",
    },
    backupButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    disabledButton: {
      opacity: 0.6,
    },
    warningCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: "#FFF3E0",
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: "#FF9500",
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      color: "#8E6B3F",
      lineHeight: 18,
    },
  });
