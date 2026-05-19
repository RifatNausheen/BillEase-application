import { hexToRGBA } from "@/utils/misc";
import { Ionicons } from "@expo/vector-icons";
import { Theme, useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getAllProducts,
  getPresetById,
  insertPreset,
  Product,
  updatePreset,
} from "../utils/database";

interface AddPresetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  presetId?: number | null;
}

interface SelectedProduct {
  product_id: number;
  product_name: string;
  product_rate: number;
  quantity: string;
}

export default function AddPresetModal({
  visible,
  onClose,
  onSuccess,
  presetId,
}: AddPresetModalProps) {
  const [presetName, setPresetName] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    if (visible) {
      loadProducts();
      if (presetId) {
        loadPresetData(presetId);
      } else {
        resetForm();
      }
    }
  }, [visible, presetId]);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadPresetData = async (id: number) => {
    try {
      const preset = await getPresetById(id);
      if (preset) {
        setPresetName(preset.preset_name);
        setSelectedProducts(
          preset.particulars.map((p) => ({
            product_id: p.product_id,
            product_name: p.product_name,
            product_rate: p.product_rate,
            quantity: p.quantity.toString(),
          }))
        );
      }
    } catch (error) {
      console.error("Error loading preset:", error);
    }
  };

  const resetForm = () => {
    setPresetName("");
    setSelectedProducts([]);
    setShowProductPicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddProduct = (product: Product) => {
    const exists = selectedProducts.find(
      (p) => p.product_id === product.product_id
    );
    if (exists) {
      ToastAndroid.show(
        "This product is already in the preset",
        ToastAndroid.LONG
      );
      return;
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        product_id: product.product_id!,
        product_name: product.product_name,
        product_rate: product.product_rate,
        quantity: "1",
      },
    ]);
  };

  const handleToggleProductSelection = (productId: number) => {
    const newSelection = new Set(selectedProductIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProductIds(newSelection);
  };

  const handleAddSelectedProducts = () => {
    const productsToAdd = products.filter(
      (p) =>
        selectedProductIds.has(p.product_id!) &&
        !selectedProducts.find((sp) => sp.product_id === p.product_id)
    );

    const newProducts: SelectedProduct[] = productsToAdd.map((product) => ({
      product_id: product.product_id!,
      product_name: product.product_name,
      product_rate: product.product_rate,
      quantity: "1",
    }));

    setSelectedProducts([...selectedProducts, ...newProducts]);
    setShowProductPicker(false);
    setProductSearchQuery("");
    setSelectedProductIds(new Set());
  };

  const getFilteredProducts = () => {
    if (!productSearchQuery.trim()) {
      return products;
    }
    const query = productSearchQuery.toLowerCase();
    return products.filter((p) => p.product_name.toLowerCase().includes(query));
  };

  const isProductAdded = (productId: number): boolean => {
    return selectedProducts.some((p) => p.product_id === productId);
  };

  const handleUpdateQuantity = (productId: number, quantity: string) => {
    const qty = parseFloat(quantity) || 0;
    if (qty < 0) return;
    setSelectedProducts(
      selectedProducts.map((p) =>
        p.product_id === productId ? { ...p, quantity: quantity } : p
      )
    );
  };

  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(
      selectedProducts.filter((p) => p.product_id !== productId)
    );
  };

  const validateInputs = (): boolean => {
    if (!presetName.trim()) {
      ToastAndroid.show("Please enter preset name", ToastAndroid.LONG);
      return false;
    }

    if (selectedProducts.length === 0) {
      ToastAndroid.show("Please add at least one product", ToastAndroid.LONG);
      return false;
    }

    return true;
  };

  const calculateTotal = (): number => {
    return selectedProducts.reduce(
      (sum, p) => sum + p.product_rate * parseFloat(p.quantity),
      0
    );
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    try {
      setIsLoading(true);

      const particulars = selectedProducts.map((p) => ({
        product_id: p.product_id,
        quantity: p.quantity,
      }));

      if (presetId) {
        await updatePreset(presetId, presetName.trim(), particulars);
        ToastAndroid.show("Preset updated successfully", ToastAndroid.LONG);
      } else {
        await insertPreset(presetName.trim(), particulars);
        ToastAndroid.show("Preset created successfully", ToastAndroid.LONG);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error saving preset:", error);
      ToastAndroid.show("Failed to save preset", ToastAndroid.LONG);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {presetId ? "Edit Preset" : "Create Preset"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={hexToRGBA(colors.text, 0.5)}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Preset Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={presetName}
                  onChangeText={setPresetName}
                  placeholder="e.g., Standard Package"
                  placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                />
              </View>

              <View style={styles.productsSection}>
                <View style={styles.productsSectionHeader}>
                  <Text style={styles.label}>
                    Products <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.addProductButton}
                    onPress={() => setShowProductPicker(true)}
                  >
                    <Ionicons name="add-circle" size={24} color="#007AFF" />
                  </TouchableOpacity>
                </View>

                {selectedProducts.length === 0 ? (
                  <View style={styles.emptyProducts}>
                    <Ionicons
                      name="cube-outline"
                      size={48}
                      color={hexToRGBA(colors.text, 0.3)}
                    />
                    <Text style={styles.emptyProductsText}>
                      No products added
                    </Text>
                  </View>
                ) : (
                  <View style={styles.productsList}>
                    {selectedProducts.map((product) => (
                      <View key={product.product_id} style={styles.productItem}>
                        <View style={styles.productInfo}>
                          <Text style={styles.productName}>
                            {product.product_name}
                          </Text>
                          <Text style={styles.productRate}>
                            ₹{product.product_rate.toFixed(2)}
                          </Text>
                        </View>
                        <View style={styles.productActions}>
                          <View style={styles.quantityControl}>
                            <TouchableOpacity
                              onPress={() =>
                                handleUpdateQuantity(
                                  product.product_id,
                                  (parseFloat(product.quantity) - 1).toString()
                                )
                              }
                              disabled={parseFloat(product.quantity) <= 0}
                            >
                              <Ionicons
                                name="remove-circle-outline"
                                size={24}
                                color={
                                  parseFloat(product.quantity) <= 0
                                    ? hexToRGBA(colors.text, 0.5)
                                    : "#007AFF"
                                }
                              />
                            </TouchableOpacity>
                            <TextInput
                              style={styles.quantityInput}
                              value={product.quantity}
                              onChangeText={(text) =>
                                handleUpdateQuantity(product.product_id, text)
                              }
                              keyboardType="number-pad"
                            />
                            <TouchableOpacity
                              onPress={() =>
                                handleUpdateQuantity(
                                  product.product_id,
                                  (parseFloat(product.quantity) + 1).toString()
                                )
                              }
                            >
                              <Ionicons
                                name="add-circle-outline"
                                size={24}
                                color="#007AFF"
                              />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            onPress={() =>
                              handleRemoveProduct(product.product_id)
                            }
                            style={styles.removeButton}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color="#FF3B30"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {selectedProducts.length > 0 && (
                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Estimated Total</Text>
                  <Text style={styles.totalAmount}>
                    ₹{calculateTotal().toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                isLoading && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? "Saving..." : presetId ? "Update" : "Create"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Picker Modal */}
        {showProductPicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Product</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowProductPicker(false);
                    setProductSearchQuery("");
                    setSelectedProductIds(new Set());
                  }}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={hexToRGBA(colors.text, 0.5)}
                  />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Ionicons
                  name="search"
                  size={20}
                  color={hexToRGBA(colors.text, 0.5)}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products..."
                  placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                  value={productSearchQuery}
                  onChangeText={setProductSearchQuery}
                />
                {productSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setProductSearchQuery("")}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={hexToRGBA(colors.text, 0.5)}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Selected Count */}
              {selectedProductIds.size > 0 && (
                <View style={styles.selectionBanner}>
                  <Text style={styles.selectionText}>
                    {selectedProductIds.size} product
                    {selectedProductIds.size > 1 ? "s" : ""} selected
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedProductIds(new Set())}
                  >
                    <Text style={styles.clearSelectionText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                data={products}
                keyExtractor={(item) => item.product_id!.toString()}
                renderItem={({ item }) => {
                  const isAdded = isProductAdded(item.product_id!);
                  const isSelected = selectedProductIds.has(item.product_id!);

                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerItem,
                        isAdded && styles.pickerItemDisabled,
                      ]}
                      onPress={() =>
                        !isAdded &&
                        handleToggleProductSelection(item.product_id!)
                      }
                      disabled={isAdded}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isAdded && styles.checkboxDisabled,
                        ]}
                      >
                        {isSelected && !isAdded && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color="#007AFF"
                          />
                        )}
                        {isAdded && (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={hexToRGBA(colors.text, 0.5)}
                          />
                        )}
                      </View>
                      <View style={styles.pickerItemInfo}>
                        <Text
                          style={[
                            styles.pickerItemName,
                            isAdded && styles.pickerItemTextDisabled,
                          ]}
                        >
                          {item.product_name}
                        </Text>
                        <Text
                          style={[
                            styles.pickerItemRate,
                            isAdded && styles.pickerItemTextDisabled,
                          ]}
                        >
                          ₹{item.product_rate.toFixed(2)}
                        </Text>
                      </View>
                      {isAdded && (
                        <View style={styles.addedBadge}>
                          <Text style={styles.addedBadgeText}>Added</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyPicker}>
                    <Text style={styles.emptyPickerText}>
                      {productSearchQuery
                        ? "No products found"
                        : "No products available"}
                    </Text>
                    {!productSearchQuery && (
                      <Text style={styles.emptyPickerSubtext}>
                        Add products first
                      </Text>
                    )}
                  </View>
                }
              />

              {selectedProductIds.size > 0 && (
                <View style={styles.pickerFooter}>
                  <TouchableOpacity
                    style={styles.addSelectedButton}
                    onPress={handleAddSelectedProducts}
                  >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.addSelectedButtonText}>
                      Add {selectedProductIds.size} Product
                      {selectedProductIds.size > 1 ? "s" : ""}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      //   paddingBottom: Platform.OS === "ios" ? 34 : 20,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderTopWidth: 1,
      borderRightWidth: 1,
      borderLeftWidth: 1,
      maxHeight: "90%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    title: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    scrollContent: {
      maxHeight: 500,
    },
    form: {
      padding: 20,
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
    required: {
      color: "#FF3B30",
    },
    input: {
      backgroundColor: hexToRGBA(colors.text, 0.1),
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    productsSection: {
      marginBottom: 20,
    },
    productsSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    addProductButton: {
      padding: 4,
    },
    emptyProducts: {
      alignItems: "center",
      padding: 32,
      backgroundColor: hexToRGBA(colors.text, 0.1),
      borderRadius: 10,
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
    },
    emptyProductsText: {
      marginTop: 12,
      fontSize: 14,
      color: hexToRGBA(colors.text, 0.5),
    },
    productsList: {
      gap: 12,
    },
    productItem: {
      backgroundColor: hexToRGBA(colors.background, 0.2),
      borderRadius: 10,
      padding: 12,
    },
    productInfo: {
      marginBottom: 8,
    },
    productName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    productRate: {
      fontSize: 13,
      color: hexToRGBA(colors.text, 0.5),
    },
    productActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    quantityControl: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    quantityInput: {
      width: 50,
      textAlign: "center",
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 6,
      padding: 6,
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    removeButton: {
      padding: 4,
    },
    totalSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: colors.background,
      borderRadius: 10,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    totalAmount: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#007AFF",
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      padding: 20,
      paddingBottom: Platform.OS === "ios" ? 34 : 20,
      borderTopWidth: 1,
      borderTopColor: hexToRGBA(colors.text, 0.15),
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 10,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: colors.background,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    saveButton: {
      backgroundColor: "#007AFF",
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    disabledButton: {
      opacity: 0.6,
    },
    pickerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    pickerContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "70%",
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    pickerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    pickerItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    pickerItemDisabled: {
      opacity: 0.5,
      backgroundColor: hexToRGBA(colors.text, 0.2),
    },
    pickerItemInfo: {
      flex: 1,
      marginLeft: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: "#007AFF",
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxDisabled: {
      borderColor: hexToRGBA(colors.text, 0.5),
    },
    pickerItemName: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 4,
    },
    pickerItemRate: {
      fontSize: 14,
      color: hexToRGBA(colors.text, 0.5),
    },
    pickerItemTextDisabled: {
      color: hexToRGBA(colors.text, 0.2),
    },
    addedBadge: {
      backgroundColor: hexToRGBA(colors.text, 0.15),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    addedBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: hexToRGBA(colors.text, 0.5),
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      alignContent: "center",
      backgroundColor: hexToRGBA(colors.text, 0.1),
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      margin: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    selectionBanner: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: hexToRGBA(colors.text, 0.2),
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    selectionText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#007AFF",
    },
    clearSelectionText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FF3B30",
    },
    pickerFooter: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: hexToRGBA(colors.text, 0.15),
    },
    addSelectedButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#007AFF",
      padding: 16,
      borderRadius: 10,
    },
    addSelectedButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    emptyPicker: {
      alignItems: "center",
      padding: 40,
    },
    emptyPickerText: {
      fontSize: 16,
      fontWeight: "600",
      color: hexToRGBA(colors.text, 0.5),
      marginBottom: 4,
    },
    emptyPickerSubtext: {
      fontSize: 14,
      color: hexToRGBA(colors.text, 0.2),
    },
  });
