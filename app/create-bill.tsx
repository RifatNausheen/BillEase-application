import { hexToRGBA } from "@/utils/misc";
import { Ionicons } from "@expo/vector-icons";
import { Theme, useTheme } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  BillParticular,
  Client,
  getAllClients,
  getAllPresets,
  getAllProducts,
  getBillById,
  getPresetById,
  insertBill,
  Preset,
  Product,
  updateBill,
} from "../utils/database";

interface BillItem {
  id: string;
  name: string;
  rate: string;
  quantity: string;
}

export default function CreateBillScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const billId = params.billId ? parseInt(params.billId as string) : null;
  const isEditMode = !!billId;

  const { colors } = useTheme();

  const styles = createStyles(colors);

  // Step 1: Client Info
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  // Step 2: Products
  const [items, setItems] = useState<BillItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    loadData();
    if (isEditMode && billId) {
      loadBillData(billId);
    }
  }, []);

  const loadBillData = async (id: number) => {
    try {
      const bill = await getBillById(id);
      if (bill) {
        setClientName(bill.client_name);
        setClientPhone(bill.client_phone || "");
        setDiscount(bill.discount.toString());

        // Parse bill particulars
        const particulars: BillParticular[] = JSON.parse(bill.bill_particulars);
        const billItems: BillItem[] = particulars.map(([name, rate, qty]) => ({
          id: Math.random().toString(),
          name,
          rate: rate.toString(),
          quantity: qty.toString(),
        }));
        setItems(billItems);
        setStep(2); // Go directly to step 2 when editing
      }
    } catch (error) {
      console.error("Error loading bill:", error);
      ToastAndroid.show("Failed to load bill", ToastAndroid.LONG);
    }
  };

  const loadData = async () => {
    try {
      const [clientsData, productsData, presetsData] = await Promise.all([
        getAllClients(),
        getAllProducts(),
        getAllPresets(),
      ]);
      setClients(clientsData);
      setProducts(productsData);
      setPresets(presetsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleClientNameChange = (text: string) => {
    setClientName(text);
    setShowClientSuggestions(text.length > 0);
  };

  const handleSelectClient = (client: Client) => {
    setClientName(client.client_name);
    setClientPhone(client.client_phone || "");
    setShowClientSuggestions(false);
  };

  const handleSelectPreset = async (presetId: number) => {
    try {
      const preset = await getPresetById(presetId);
      if (preset) {
        const newItems: BillItem[] = preset.particulars.map((p) => ({
          id: Math.random().toString(),
          name: p.product_name,
          rate: p.product_rate.toString(),
          quantity: p.quantity.toString(),
        }));
        setItems(newItems);
        setShowPresetPicker(false);
        setStep(2);
      }
    } catch (error) {
      console.error("Error loading preset:", error);
      ToastAndroid.show("Failed to load preset", ToastAndroid.LONG);
    }
  };

  const handleContinueToStep2 = () => {
    setStep(2);
  };

  const handleAddItem = () => {
    const newItem: BillItem = {
      id: Math.random().toString(),
      name: "",
      rate: "",
      quantity: "1",
    };
    setItems([...items, newItem]);
  };

  const handleAddProductFromList = (product: Product) => {
    const newItem: BillItem = {
      id: Math.random().toString(),
      name: product.product_name,
      rate: product.product_rate.toString(),
      quantity: "1",
    };
    setItems([...items, newItem]);
    setShowProductPicker(false);
    setProductSearchQuery("");
    setSelectedProductIds(new Set());
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
    const selectedProducts = products.filter((p) =>
      selectedProductIds.has(p.product_id!)
    );
    const newItems: BillItem[] = selectedProducts.map((product) => ({
      id: Math.random().toString(),
      name: product.product_name,
      rate: product.product_rate.toString(),
      quantity: "1",
    }));
    setItems([...items, ...newItems]);
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

  const handleUpdateItem = (
    id: string,
    field: keyof BillItem,
    value: string
  ) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const calculateSubtotal = (): number => {
    return items.reduce((sum, item) => {
      const rate = parseFloat(item.rate) || 0;
      const qty = parseFloat(item.quantity) || 0;
      return sum + rate * qty;
    }, 0);
  };

  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal();
    const discountAmount = parseFloat(discount) || 0;
    return Math.max(0, subtotal - discountAmount);
  };

  const validateBill = (): boolean => {
    if (items.length === 0) {
      ToastAndroid.show("Please add at least one item", ToastAndroid.LONG);
      return false;
    }

    for (const item of items) {
      if (!item.name.trim()) {
        ToastAndroid.show("All items must have a name", ToastAndroid.LONG);
        return false;
      }
      const rate = parseFloat(item.rate);
      if (isNaN(rate) || rate < 0) {
        ToastAndroid.show(
          "All items must have a valid rate",
          ToastAndroid.LONG
        );
        return false;
      }
      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        ToastAndroid.show(
          "All items must have a quantity of more than 0",
          ToastAndroid.LONG
        );
        return false;
      }
    }

    return true;
  };

  const handleSaveBill = async () => {
    if (!validateBill()) return;

    try {
      setIsSaving(true);

      const billParticulars: BillParticular[] = items.map((item) => [
        item.name.trim(),
        parseFloat(item.rate),
        parseFloat(item.quantity),
      ]);

      const billData = {
        client_name: clientName.trim() || "Walk-in Customer",
        client_phone: clientPhone.trim() || undefined,
        total_amount: calculateTotal(),
        discount: parseFloat(discount) || 0,
        bill_particulars: JSON.stringify(billParticulars),
      };

      if (isEditMode && billId) {
        // Update existing bill
        await updateBill(billId, billData);
        ToastAndroid.show("Bill updated successfully", ToastAndroid.LONG);
        router.replace({
          pathname: "/view-bill",
          params: { billId: billId.toString() },
        });
      } else {
        // Create new bill
        const newBillId = await insertBill(billData);
        router.replace({
          pathname: "/view-bill",
          params: { billId: newBillId.toString() },
        });
      }
    } catch (error) {
      console.error("Error saving bill:", error);
      ToastAndroid.show("Failed to save bill", ToastAndroid.LONG);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.client_name.toLowerCase().includes(clientName.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ height: "100%" }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? "Edit Bill" : "Create Bill"}
          </Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>
              {isEditMode ? "Editing" : `Step ${step}/2`}
            </Text>
          </View>
        </View>

        {step === 1 ? (
          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps={showClientSuggestions}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Client Information</Text>
              <Text style={styles.sectionSubtitle}>
                Optional - Skip to create anonymous bill
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Client Name</Text>
                <TextInput
                  style={styles.input}
                  value={clientName}
                  onChangeText={handleClientNameChange}
                  placeholder="Enter client name"
                  placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                  onBlur={() => setShowClientSuggestions(false)}
                  onFocus={() => handleClientNameChange(clientName)}
                />
                {showClientSuggestions && filteredClients.length > 0 && (
                  <View style={{ position: "relative", zIndex: 2 }}>
                    <View style={styles.suggestions}>
                      {filteredClients.slice(0, 5).map((client) => (
                        <TouchableOpacity
                          key={client.client_id}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectClient(client)}
                        >
                          <Text style={styles.suggestionName}>
                            {client.client_name}
                          </Text>
                          {client.client_phone && (
                            <Text style={styles.suggestionPhone}>
                              {client.client_phone}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Start with Preset</Text>
              <Text style={styles.sectionSubtitle}>
                Optional - Select a preset or start empty
              </Text>

              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setShowPresetPicker(true)}
              >
                <Ionicons name="layers-outline" size={20} color="#007AFF" />
                <Text style={styles.presetButtonText}>Select Preset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleContinueToStep2}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={colors.background}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.step2Container}>
            <ScrollView style={styles.content}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Bill Items</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowProductPicker(true)}
                  >
                    <Ionicons name="add-circle" size={24} color="#007AFF" />
                  </TouchableOpacity>
                </View>

                {items.length === 0 ? (
                  <View style={styles.emptyItems}>
                    <Ionicons
                      name="receipt-outline"
                      size={48}
                      color={hexToRGBA(colors.text, 0.5)}
                    />
                    <Text style={styles.emptyText}>No items added</Text>
                    <TouchableOpacity
                      style={styles.addFirstButton}
                      onPress={handleAddItem}
                    >
                      <Text style={styles.addFirstButtonText}>
                        Add First Item
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.itemsList}>
                    {items.map((item, index) => (
                      <View key={item.id} style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                          <Text style={styles.itemNumber}>#{index + 1}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveItem(item.id)}
                          >
                            <Ionicons
                              name="close-circle"
                              size={24}
                              color="#FF3B30"
                            />
                          </TouchableOpacity>
                        </View>

                        <TextInput
                          style={styles.itemInput}
                          value={item.name}
                          onChangeText={(text) =>
                            handleUpdateItem(item.id, "name", text)
                          }
                          placeholder="Item name"
                          placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                        />

                        <View style={styles.itemRow}>
                          <View style={styles.itemField}>
                            <Text style={styles.itemLabel}>Rate (₹)</Text>
                            <TextInput
                              style={styles.itemInputSmall}
                              value={item.rate}
                              onChangeText={(text) =>
                                handleUpdateItem(item.id, "rate", text)
                              }
                              placeholder="0.00"
                              placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                              keyboardType="decimal-pad"
                            />
                          </View>

                          <View style={styles.itemField}>
                            <Text style={styles.itemLabel}>Quantity</Text>
                            <TextInput
                              style={styles.itemInputSmall}
                              value={item.quantity}
                              onChangeText={(text) =>
                                handleUpdateItem(item.id, "quantity", text)
                              }
                              placeholder="1"
                              placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                              keyboardType="number-pad"
                            />
                          </View>

                          <View style={styles.itemField}>
                            <Text style={styles.itemLabel}>Amount</Text>
                            <Text style={styles.itemAmount}>
                              ₹
                              {(
                                (parseFloat(item.rate) || 0) *
                                (parseFloat(item.quantity) || 0)
                              ).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={styles.addMoreButton}
                      onPress={handleAddItem}
                    >
                      <Ionicons name="add" size={20} color="#007AFF" />
                      <Text style={styles.addMoreText}>Add Another Item</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>
                      ₹{calculateSubtotal().toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.discountRow}>
                    <Text style={styles.summaryLabel}>Discount</Text>
                    <View style={styles.discountInput}>
                      <Text style={styles.currencySymbol}>₹</Text>
                      <TextInput
                        style={styles.discountValue}
                        value={discount}
                        onChangeText={setDiscount}
                        placeholder="0.00"
                        placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      ₹{calculateTotal().toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setStep(1)}
              >
                <Ionicons name="arrow-back" size={20} color="#007AFF" />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.saveButton,
                  isSaving && styles.disabledButton,
                ]}
                onPress={handleSaveBill}
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText}>
                  {isSaving
                    ? "Saving..."
                    : isEditMode
                    ? "Update Bill"
                    : "Save Bill"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Preset Picker Modal */}
        <Modal visible={showPresetPicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Preset</Text>
                <TouchableOpacity onPress={() => setShowPresetPicker(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={hexToRGBA(colors.text, 0.5)}
                  />
                </TouchableOpacity>
              </View>
              <FlatList
                data={presets}
                keyExtractor={(item) => item.preset_id!.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handleSelectPreset(item.preset_id!)}
                  >
                    <Ionicons name="layers" size={24} color="#007AFF" />
                    <Text style={styles.modalItemText}>{item.preset_name}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={hexToRGBA(colors.text, 0.5)}
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyModal}>
                    <Text style={styles.emptyModalText}>
                      No presets available
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>

        {/* Product Picker Modal */}
        <Modal visible={showProductPicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Products</Text>
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
                  placeholderTextColor={hexToRGBA(colors.text, 0.25)}
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
                data={getFilteredProducts()}
                keyExtractor={(item) => item.product_id!.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handleAddProductFromList(item)}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        handleToggleProductSelection(item.product_id!)
                      }
                    >
                      <View style={styles.checkbox}>
                        {selectedProductIds.has(item.product_id!) && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#007AFF"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemText}>
                        {item.product_name}
                      </Text>
                      <Text style={styles.modalItemSubtext}>
                        ₹{item.product_rate.toFixed(2)}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color="#007AFF" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyModal}>
                    <Text style={styles.emptyModalText}>
                      {productSearchQuery
                        ? "No products found"
                        : "No products available"}
                    </Text>
                  </View>
                }
              />
              <View style={styles.modalFooter}>
                {selectedProductIds.size > 0 ? (
                  <TouchableOpacity
                    style={styles.addSelectedButton}
                    onPress={handleAddSelectedProducts}
                  >
                    <Ionicons name="add-circle" size={20} color={colors.text} />
                    <Text style={styles.addSelectedButtonText}>
                      Add {selectedProductIds.size} Product
                      {selectedProductIds.size > 1 ? "s" : ""}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.manualAddButton}
                    onPress={() => {
                      setShowProductPicker(false);
                      setProductSearchQuery("");
                      handleAddItem();
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#007AFF" />
                    <Text style={styles.manualAddText}>Add Custom Item</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: Theme["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: hexToRGBA(colors.text, 0.05),
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
    stepIndicator: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: hexToRGBA(colors.text, 0.2),
      borderRadius: 12,
    },
    stepText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#007AFF",
    },
    content: {
      flex: 1,
    },
    step2Container: {
      flex: 1,
    },
    section: {
      padding: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: hexToRGBA(colors.text, 0.6),
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
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
    suggestions: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 10,
      marginTop: 4,
      maxHeight: 200,
      position: "absolute",
      width: "100%",
    },
    suggestionItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    suggestionName: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 2,
    },
    suggestionPhone: {
      fontSize: 13,
      color: hexToRGBA(colors.text, 0.5),
    },
    presetButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: "#007AFF",
      borderRadius: 10,
      padding: 14,
    },
    presetButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#007AFF",
    },
    addButton: {
      padding: 4,
    },
    emptyItems: {
      alignItems: "center",
      padding: 40,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    emptyText: {
      fontSize: 16,
      color: hexToRGBA(colors.text, 0.5),
      marginTop: 12,
      marginBottom: 16,
    },
    addFirstButton: {
      backgroundColor: "#007AFF",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    addFirstButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.background,
    },
    itemsList: {
      gap: 12,
    },
    itemCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    itemNumber: {
      fontSize: 14,
      fontWeight: "600",
      color: "#007AFF",
    },
    itemInput: {
      backgroundColor: hexToRGBA(colors.text, 0.1),
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 12,
    },
    itemRow: {
      flexDirection: "row",
      gap: 12,
    },
    itemField: {
      flex: 1,
    },
    itemLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: hexToRGBA(colors.text, 0.5),
      marginBottom: 6,
    },
    itemInputSmall: {
      backgroundColor: hexToRGBA(colors.text, 0.1),
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 8,
      padding: 10,
      fontSize: 14,
      color: colors.text,
    },
    itemAmount: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      padding: 10,
    },
    addMoreButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 10,
      padding: 14,
      borderStyle: "dashed",
    },
    addMoreText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#007AFF",
    },
    summaryCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 15,
      color: colors.text,
    },
    summaryValue: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    discountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    discountInput: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: hexToRGBA(colors.text, 0.1),
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 8,
      paddingHorizontal: 12,
    },
    currencySymbol: {
      fontSize: 15,
      fontWeight: "600",
      color: hexToRGBA(colors.text, 0.5),
      marginRight: 4,
    },
    discountValue: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      padding: 8,
      minWidth: 60,
    },
    divider: {
      height: 1,
      backgroundColor: hexToRGBA(colors.text, 0.15),
      marginVertical: 12,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    totalValue: {
      fontSize: 22,
      fontWeight: "bold",
      color: "#007AFF",
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      padding: 16,
      // backgroundColor: hexToRGBA(colors.text, 0.02),
      borderTopWidth: 1,
      borderTopColor: hexToRGBA(colors.text, 0.15),
    },
    primaryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#007AFF",
      padding: 16,
      borderRadius: 10,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: hexToRGBA(colors.text, 0.05),
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.075),
      padding: 16,
      borderRadius: 10,
      minWidth: 100,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#007AFF",
    },
    saveButton: {
      flex: 2,
    },
    disabledButton: {
      opacity: 0.6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "70%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    modalItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: "#007AFF",
      justifyContent: "center",
      alignItems: "center",
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      alignContent: "center",
      backgroundColor: hexToRGBA(colors.text, 0.1),
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      margin: 12,
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
      backgroundColor: hexToRGBA(colors.text, 0.3),
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
    modalItemInfo: {
      flex: 1,
    },
    modalItemText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 2,
    },
    modalItemSubtext: {
      fontSize: 14,
      color: hexToRGBA(colors.text, 0.5),
    },
    emptyModal: {
      alignItems: "center",
      padding: 40,
    },
    emptyModalText: {
      fontSize: 16,
      color: hexToRGBA(colors.text, 0.5),
    },
    modalFooter: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: hexToRGBA(colors.text, 0.15),
    },
    manualAddButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: hexToRGBA(colors.text, 0.1),
      padding: 14,
      borderRadius: 10,
    },
    manualAddText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#007AFF",
    },
  });
