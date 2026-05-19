import FloatingActionButton from "@/components/FloatingActionButton";
import { useSearch } from "@/context/useSearch";
import { hexToRGBA } from "@/utils/misc";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { Bill, deleteBill, getAllBills } from "../../utils/database";

export default function BillsScreen() {
  const router = useRouter();
  const { searchQuery } = useSearch();
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { colors } = useTheme();

  const styles = createStyles(colors);

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [])
  );

  // Filter bills when search query changes
  useEffect(() => {
    filterBills();
  }, [searchQuery, bills]);

  const loadBills = async () => {
    try {
      setIsLoading(true);
      const data = await getAllBills();
      setBills(data);
      setFilteredBills(data);
    } catch (error) {
      console.error("Error loading bills:", error);
      ToastAndroid.show("Failed to load bills", ToastAndroid.LONG);
    } finally {
      setIsLoading(false);
    }
  };

  const filterBills = () => {
    if (!searchQuery.trim()) {
      setFilteredBills(bills);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = bills.filter((bill) => {
      // Search by client name
      if (bill.client_name.toLowerCase().includes(query)) return true;

      // Search by client phone
      if (bill.client_phone?.toLowerCase().includes(query)) return true;

      // Search by date (formatted)
      const dateStr = formatDate(bill.date_issued!).toLowerCase();
      if (dateStr.includes(query)) return true;

      // Search by bill ID
      if (bill.bill_id?.toString().includes(query)) return true;

      return false;
    });

    setFilteredBills(filtered);
  };

  const handleDelete = (id: number) => {
    Alert.alert("Delete Bill", "Are you sure you want to delete this bill?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBill(id);
            loadBills();
            ToastAndroid.show("Bill deleted successfully", ToastAndroid.LONG);
          } catch (error) {
            console.error("Error deleting bill:", error);
            ToastAndroid.show("Failed to delete bill", ToastAndroid.LONG);
          }
        },
      },
    ]);
  };

  const handleAddBill = () => {
    router.push("/create-bill");
  };

  const handleViewBill = (billId: number) => {
    router.push({
      pathname: "/view-bill",
      params: { billId: billId.toString() },
    });
  };

  const handleEditBill = (billId: number) => {
    router.push({
      pathname: "/create-bill",
      params: { billId: billId.toString() },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderBillItem = ({ item }: { item: Bill }) => (
    <TouchableOpacity
      style={styles.billCard}
      onPress={() => handleViewBill(item.bill_id!)}
    >
      <View style={styles.billHeader}>
        <View style={styles.billInfo}>
          <Text style={styles.clientName}>{item.client_name}</Text>
          {item.client_phone && (
            <Text style={styles.clientPhone}>{item.client_phone}</Text>
          )}
        </View>
        <View style={styles.billAmount}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>
            ₹{item.total_amount.toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={styles.billFooter}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
          <Text style={styles.dateText}>{formatDate(item.date_issued!)}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditBill(item.bill_id!);
            }}
          >
            <Ionicons name="create-outline" size={18} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item.bill_id!);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filteredBills.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? "No bills found" : "No Bills"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? "Try a different search term"
              : "Create your first bill to get started"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          renderItem={renderBillItem}
          keyExtractor={(item) => item.bill_id!.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FloatingActionButton onPress={handleAddBill} icon="add" />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: hexToRGBA(colors.text, 0.05),
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    loadingText: {
      fontSize: 16,
      color: colors.muted,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 16,
      color: colors.muted,
      textAlign: "center",
    },
    listContent: {
      padding: 16,
    },
    billCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: colors.text,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 1.5,
    },
    billHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    billInfo: {
      flex: 1,
    },
    clientName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    clientPhone: {
      fontSize: 14,
      color: colors.muted,
    },
    billAmount: {
      alignItems: "flex-end",
    },
    amountLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 2,
    },
    amountValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#34C759",
    },
    billFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: "#E5E5EA",
    },
    dateContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    dateText: {
      fontSize: 13,
      color: "#8E8E93",
    },
    actions: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      padding: 4,
    },
  });
