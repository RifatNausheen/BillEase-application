import { hexToRGBA } from "@/utils/misc";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { insertProduct, Product, updateProduct } from "../utils/database";

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editProduct?: Product | null;
}

export default function AddProductModal({
  visible,
  onClose,
  onSuccess,
  editProduct,
}: AddProductModalProps) {
  const [productName, setProductName] = useState(
    editProduct?.product_name || ""
  );
  const [productRate, setProductRate] = useState(
    editProduct?.product_rate ? editProduct.product_rate.toString() : ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();

  const styles = createStyles(colors);

  const handleReset = () => {
    setProductName(editProduct?.product_name || "");
    setProductRate(
      editProduct?.product_rate ? editProduct.product_rate.toString() : ""
    );
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const validateInputs = (): boolean => {
    if (!productName.trim()) {
      ToastAndroid.show("Please enter product name", ToastAndroid.LONG);
      return false;
    }

    if (!productRate.trim()) {
      ToastAndroid.show("Please enter product rate", ToastAndroid.LONG);
      return false;
    }

    const rate = parseFloat(productRate);
    if (isNaN(rate) || rate <= 0) {
      ToastAndroid.show(
        "Please enter a valid rate greater than 0",
        ToastAndroid.LONG
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    try {
      setIsLoading(true);
      const rate = parseFloat(productRate);

      if (editProduct?.product_id) {
        // Update existing product
        await updateProduct(editProduct.product_id, {
          product_name: productName.trim(),
          product_rate: rate,
        });
        ToastAndroid.show("Product updated successfully", ToastAndroid.LONG);
      } else {
        // Create new product
        await insertProduct({
          product_name: productName.trim(),
          product_rate: rate,
        });
        ToastAndroid.show("Product added successfully", ToastAndroid.LONG);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error saving product:", error);
      ToastAndroid.show("Failed to save product", ToastAndroid.LONG);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateChange = (text: string) => {
    // Allow only numbers and decimal point
    const filtered = text.replace(/[^0-9.]/g, "");

    // Prevent multiple decimal points
    const parts = filtered.split(".");
    if (parts.length > 2) {
      return;
    }

    setProductRate(filtered);
  };

  useEffect(() => {
    handleReset();
  }, [editProduct]);

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
              {editProduct ? "Edit Product" : "Add Product"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Product Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={productName}
                onChangeText={setProductName}
                placeholder="Enter product name"
                placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Rate (₹) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.rateInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.rateInput}
                  value={productRate}
                  onChangeText={handleRateChange}
                  placeholder="0.00"
                  placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

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
                {isLoading ? "Saving..." : editProduct ? "Update" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: any) =>
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
      paddingBottom: Platform.OS === "ios" ? 34 : 20,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderTopWidth: 1,
      borderRightWidth: 1,
      borderLeftWidth: 1,
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
      backgroundColor: hexToRGBA(colors.text, 0.2),
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 10,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    rateInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: hexToRGBA(colors.text, 0.2),
      borderWidth: 1,
      borderColor: hexToRGBA(colors.text, 0.15),
      borderRadius: 10,
      paddingLeft: 14,
    },
    currencySymbol: {
      fontSize: 16,
      fontWeight: "600",
      color: hexToRGBA(colors.text, 0.5),
      marginRight: 8,
    },
    rateInput: {
      flex: 1,
      padding: 14,
      paddingLeft: 0,
      fontSize: 16,
      color: colors.text,
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    button: {
      flex: 1,
      padding: 16,
      borderRadius: 10,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: "#F2F2F7",
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#000000",
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
  });
