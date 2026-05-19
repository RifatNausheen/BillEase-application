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
import { Client, insertClient, updateClient } from "../utils/database";

interface AddClientModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editClient?: Client | null;
}

export default function AddClientModal({
  visible,
  onClose,
  onSuccess,
  editClient,
}: AddClientModalProps) {
  const [clientName, setClientName] = useState(editClient?.client_name || "");
  const [phoneNumber, setPhoneNumber] = useState(
    editClient?.client_phone || ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handleReset = () => {
    setClientName(editClient?.client_name || "");
    setPhoneNumber(editClient?.client_phone || "");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const validateInputs = (): boolean => {
    if (!clientName.trim()) {
      ToastAndroid.show("Please enter client name", ToastAndroid.LONG);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateInputs()) return;

    try {
      setIsLoading(true);

      if (editClient?.client_id) {
        // Update existing client
        await updateClient(editClient.client_id, {
          client_name: clientName.trim(),
          client_phone: phoneNumber.trim() || undefined,
        });
        ToastAndroid.show("Client updated successfully", ToastAndroid.LONG);
      } else {
        // Create new client
        await insertClient({
          client_name: clientName.trim(),
          client_phone: phoneNumber.trim() || undefined,
        });
        ToastAndroid.show("Client added successfully", ToastAndroid.LONG);
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error saving client:", error);
      ToastAndroid.show("Failed to save client", ToastAndroid.LONG);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleReset();
  }, [editClient]);

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
              {editClient ? "Edit Client" : "Add Client"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={hexToRGBA(colors.text, 0.5)}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Client Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={clientName}
                onChangeText={setClientName}
                placeholder="Enter client name"
                placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                placeholderTextColor={hexToRGBA(colors.text, 0.5)}
                keyboardType="phone-pad"
                maxLength={10}
              />
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
                {isLoading ? "Saving..." : editClient ? "Update" : "Save"}
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
