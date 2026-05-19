import AddPresetModal from "@/components/AddPresetModal";
import { useSearch } from "@/context/useSearch";
import { hexToRGBA } from "@/utils/misc";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useTheme } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import FloatingActionButton from "../../components/FloatingActionButton";
import {
  deletePreset,
  getAllPresets,
  getPresetById,
  Preset,
} from "../../utils/database";

export default function PresetsScreen() {
  const { searchQuery } = useSearch();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [filteredPresets, setFilteredPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<number | null>(null);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useFocusEffect(
    useCallback(() => {
      loadPresets();
    }, [])
  );

  // Filter presets when search query changes
  useEffect(() => {
    filterPresets();
  }, [searchQuery, presets]);

  const loadPresets = async () => {
    try {
      setIsLoading(true);
      const data = await getAllPresets();
      setPresets(data);
      setFilteredPresets(data);
    } catch (error) {
      console.error("Error loading presets:", error);
      ToastAndroid.show("Failed to load presets", ToastAndroid.LONG);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPresets = () => {
    if (!searchQuery.trim()) {
      setFilteredPresets(presets);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = presets.filter((preset) =>
      preset.preset_name.toLowerCase().includes(query)
    );

    setFilteredPresets(filtered);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Delete Preset",
      "Are you sure you want to delete this preset?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePreset(id);
              loadPresets();
              ToastAndroid.show(
                "Preset deleted successfully",
                ToastAndroid.LONG
              );
            } catch (error) {
              console.error("Error deleting preset:", error);
              ToastAndroid.show("Failed to delete preset", ToastAndroid.LONG);
            }
          },
        },
      ]
    );
  };

  const handleAddPreset = () => {
    setEditingPresetId(null);
    setModalVisible(true);
  };

  const handleEditPreset = (presetId: number) => {
    setEditingPresetId(presetId);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingPresetId(null);
  };

  const handleModalSuccess = () => {
    loadPresets();
  };

  const handleViewPreset = async (presetId: number) => {
    try {
      const preset = await getPresetById(presetId);
      if (preset) {
        const productList = preset.particulars
          .map(
            (p) =>
              `${p.product_name} x ${
                p.quantity ? parseFloat(p.quantity).toFixed(2) : 0
              } (₹${p.product_rate.toFixed(2)})`
          )
          .join("\n");

        const total = preset.particulars.reduce(
          (sum, p) => sum + p.product_rate * parseFloat(p.quantity),
          0
        );

        Alert.alert(
          preset.preset_name,
          `Products:\n${productList}\n\nTotal: ₹${total.toFixed(2)}`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error loading preset details:", error);
      ToastAndroid.show("Failed to load preset details", ToastAndroid.LONG);
    }
  };

  const getProductCount = async (presetId: number): Promise<number> => {
    try {
      const preset = await getPresetById(presetId);
      return preset ? preset.particulars.length : 0;
    } catch {
      return 0;
    }
  };

  const renderPresetItem = ({ item }: { item: Preset }) => {
    // const [productCount, setProductCount] = useState(0);

    // // Load product count when component mounts
    // useState(() => {
    //   getProductCount(item.preset_id!).then(setProductCount);
    // });

    return (
      <TouchableOpacity
        style={styles.presetCard}
        onPress={() => handleViewPreset(item.preset_id!)}
      >
        <View style={styles.presetHeader}>
          <View style={styles.icon}>
            <Ionicons name="layers" size={24} color="#007AFF" />
          </View>
          <View style={styles.presetInfo}>
            <Text style={styles.presetName}>{item.preset_name}</Text>
            <Text style={styles.productCount}>Tap to view details</Text>
          </View>
        </View>
        <View style={styles.presetFooter}>
          <Text style={styles.createdDate}>
            {new Date(item.created_at!).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEditPreset(item.preset_id!);
              }}
            >
              <Ionicons name="create-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(item.preset_id!);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filteredPresets.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="layers-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? "No presets found" : "No Presets"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? "Try a different search term"
              : "Create preset templates for faster billing"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPresets}
          renderItem={renderPresetItem}
          keyExtractor={(item) => item.preset_id!.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FloatingActionButton onPress={handleAddPreset} />

      <AddPresetModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        presetId={editingPresetId}
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
    presetCard: {
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
    presetHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    icon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: hexToRGBA(colors.text, 0.2),
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    presetInfo: {
      flex: 1,
    },
    presetName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    productCount: {
      fontSize: 14,
      color: hexToRGBA(colors.text, 0.5),
    },
    presetFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: hexToRGBA(colors.text, 0.5),
    },
    createdDate: {
      fontSize: 13,
      color: "#8E8E93",
    },
    actions: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      padding: 8,
    },
  });
