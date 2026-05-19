import { useSearch } from "@/context/useSearch";
import { hexToRGBA } from "@/utils/misc";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useTheme } from "@react-navigation/native";
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
import AddClientModal from "../../components/AddClientModal";
import FloatingActionButton from "../../components/FloatingActionButton";
import { Client, deleteClient, getAllClients } from "../../utils/database";

export default function ClientsScreen() {
  const { searchQuery } = useSearch();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Load clients when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [])
  );

  // Filter clients when search query changes
  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const data = await getAllClients();
      setClients(data);
      setFilteredClients(data);
    } catch (error) {
      console.error("Error loading clients:", error);
      ToastAndroid.show("Failed to load clients", ToastAndroid.LONG);
    } finally {
      setIsLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter((client) => {
      // Search by name
      if (client.client_name.toLowerCase().includes(query)) return true;

      // Search by phone number
      if (client.client_phone?.toLowerCase().includes(query)) return true;

      return false;
    });

    setFilteredClients(filtered);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Delete Client",
      "Are you sure you want to delete this client?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteClient(id);
              loadClients();
              ToastAndroid.show(
                "Client deleted successfully",
                ToastAndroid.LONG
              );
            } catch (error) {
              console.error("Error deleting client:", error);
              ToastAndroid.show("Failed to delete client", ToastAndroid.LONG);
            }
          },
        },
      ]
    );
  };

  const handleAddClient = () => {
    setEditingClient(null);
    setModalVisible(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingClient(null);
  };

  const handleModalSuccess = () => {
    loadClients();
  };

  const renderClientItem = ({ item }: { item: Client }) => (
    <View style={styles.clientCard}>
      <View style={styles.clientInfo}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color="#007AFF" />
        </View>
        <View style={styles.clientDetails}>
          <Text style={styles.clientName}>{item.client_name}</Text>
          {item.client_phone && (
            <Text style={styles.clientPhone}>{item.client_phone}</Text>
          )}
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditClient(item)}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item.client_id!)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
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
      {filteredClients.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? "No clients found" : "No Clients"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? "Try a different search term"
              : "Add your first client to get started"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderClientItem}
          keyExtractor={(item) => item.client_id!.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FloatingActionButton onPress={handleAddClient} />

      <AddClientModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editClient={editingClient}
      />
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
      color: hexToRGBA(colors.text, 0.5),
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
      color: hexToRGBA(colors.text, 0.5),
      textAlign: "center",
    },
    listContent: {
      padding: 16,
    },
    clientCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: colors.text,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 1.5,
    },
    clientInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: hexToRGBA(colors.text, 0.2),
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    clientDetails: {
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
      color: hexToRGBA(colors.text, 0.5),
    },
    actions: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      padding: 8,
    },
  });
