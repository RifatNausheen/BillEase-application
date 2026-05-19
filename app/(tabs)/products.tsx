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
import AddProductModal from "../../components/AddProductModal";
import FloatingActionButton from "../../components/FloatingActionButton";
import { deleteProduct, getAllProducts, Product } from "../../utils/database";

export default function ProductsScreen() {
  const { searchQuery } = useSearch();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  // Filter products when search query changes
  useEffect(() => {
    filterProducts();
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await getAllProducts();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      ToastAndroid.show("Failed to load products", ToastAndroid.LONG);
    } finally {
      setIsLoading(false);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter((product) =>
      product.product_name.toLowerCase().includes(query)
    );

    setFilteredProducts(filtered);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProduct(id);
              loadProducts();
              ToastAndroid.show(
                "Product deleted successfully",
                ToastAndroid.LONG
              );
            } catch (error) {
              console.error("Error deleting product:", error);
              ToastAndroid.show("Failed to delete product", ToastAndroid.LONG);
            }
          },
        },
      ]
    );
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setModalVisible(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingProduct(null);
  };

  const handleModalSuccess = () => {
    loadProducts();
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <View style={styles.icon}>
          <Ionicons name="cube" size={24} color="#007AFF" />
        </View>
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.product_name}</Text>
          <Text style={styles.productRate}>
            ₹{item.product_rate.toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditProduct(item)}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item.product_id!)}
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
      {filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name="cube-outline"
            size={64}
            color={hexToRGBA(colors.text, 0.5)}
          />
          <Text style={styles.emptyTitle}>
            {searchQuery ? "No products found" : "No Products"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? "Try a different search term"
              : "Add your first product to get started"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.product_id!.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FloatingActionButton onPress={handleAddProduct} />

      <AddProductModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editProduct={editingProduct}
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
    productCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
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
      elevation: 1,
    },
    productInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
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
    productDetails: {
      flex: 1,
    },
    productName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    productRate: {
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
