import { hexToRGBA } from "@/utils/misc";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as MediaLibrary from "expo-media-library";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import {
  Bill,
  BillParticular,
  BusinessInfo,
  getBillById,
  getBusinessInfo,
} from "../utils/database";

export default function ViewBillScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const billId = parseInt(params.billId as string);
  const viewRef = useRef(null);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [bill, setBill] = useState<Bill | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [particulars, setParticulars] = useState<BillParticular[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBillData();
  }, [billId]);

  const loadBillData = async () => {
    try {
      setIsLoading(true);
      const [billData, businessData] = await Promise.all([
        getBillById(billId),
        getBusinessInfo(),
      ]);

      if (billData) {
        setBill(billData);
        const parsedParticulars: BillParticular[] = JSON.parse(
          billData.bill_particulars
        );
        setParticulars(parsedParticulars);
      }
      setBusinessInfo(businessData);
    } catch (error) {
      console.error("Error loading bill:", error);
      ToastAndroid.show("Failed to load bill", ToastAndroid.LONG);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calculateSubtotal = (): number => {
    return particulars.reduce((sum, [, rate, qty]) => sum + rate * qty, 0);
  };

  const handleEdit = () => {
    router.push({
      pathname: "/create-bill",
      params: { billId: billId.toString() },
    });
  };

  const handleSave = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to save images"
        );
        return;
      }

      const uri = await captureRef(viewRef, {
        format: "png",
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      ToastAndroid.show("Bill saved to gallery", ToastAndroid.LONG);
    } catch (error) {
      console.error("Error saving bill:", error);
      ToastAndroid.show("Failed to save bill", ToastAndroid.LONG);
    }
  };

  const handleShareImage = async () => {
    try {
      const uri = await captureRef(viewRef, {
        format: "png",
        quality: 1,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share Bill as Image",
        });
      } else {
        ToastAndroid.show(
          "Sharing is not available on this device",
          ToastAndroid.LONG
        );
      }
    } catch (error) {
      console.error("Error sharing bill:", error);
      ToastAndroid.show("Failed to share bill", ToastAndroid.LONG);
    }
  };

  const handleSharePDF = async () => {
    try {
      const html = generateHTML();
      const { uri } = await Print.printToFileAsync({ html });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Bill as PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error sharing PDF:", error);
      Alert.alert("Error", "Failed to share PDF");
    }
  };

  const handleShare = () => {
    Alert.alert("Share Bill", "Choose format to share", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Share as Image",
        onPress: handleShareImage,
      },
      {
        text: "Share as PDF",
        onPress: handleSharePDF,
      },
    ]);
  };

  const handlePrint = async () => {
    try {
      const html = generateHTML();
      await Print.printAsync({ html });
    } catch (error) {
      console.error("Error printing bill:", error);
      ToastAndroid.show("Failed to print bill", ToastAndroid.LONG);
    }
  };

  const generateHTML = (): string => {
    const subtotal = calculateSubtotal();
    const discount = bill?.discount || 0;
    const total = bill?.total_amount || 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            margin: 0;
          }
          .invoice { 
            max-width: 800px; 
            margin: 0 auto;
            border: 1px solid #ddd;
            padding: 30px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .business-name { 
            font-size: 24px; 
            font-weight: bold; 
            margin-bottom: 10px;
          }
          .business-details { 
            font-size: 14px; 
            color: #666; 
          }
          .bill-info { 
            display: flex; 
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .info-section { 
            flex: 1;
          }
          .info-label { 
            font-weight: bold; 
            color: #333;
            margin-bottom: 5px;
          }
          .info-value { 
            color: #666;
            margin-bottom: 10px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th { 
            background: #f5f5f5; 
            padding: 12px; 
            text-align: left;
            border-bottom: 2px solid #ddd;
            font-weight: bold;
          }
          td { 
            padding: 12px; 
            border-bottom: 1px solid #eee;
          }
          .text-right { 
            text-align: right; 
          }
          .totals { 
            margin-top: 20px;
            text-align: right;
          }
          .total-row { 
            display: flex; 
            justify-content: flex-end;
            padding: 8px 0;
          }
          .total-label { 
            width: 150px; 
            font-weight: bold;
          }
          .total-value { 
            width: 150px; 
            text-align: right;
          }
          .grand-total { 
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 18px;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div class="business-name">${
              businessInfo?.business_name || "Invoice"
            }</div>
            ${
              businessInfo?.business_addr
                ? `<div class="business-details">${businessInfo.business_addr}</div>`
                : ""
            }
            ${
              businessInfo?.phone_number
                ? `<div class="business-details">Phone: ${businessInfo.phone_number}</div>`
                : ""
            }
            ${
              businessInfo?.gstin
                ? `<div class="business-details">GSTIN: ${businessInfo.gstin}</div>`
                : ""
            }
          </div>
          
          <div class="bill-info">
            <div class="info-section">
              <div class="info-label">Bill To:</div>
              <div class="info-value">${bill?.client_name || "N/A"}</div>
              ${
                bill?.client_phone
                  ? `<div class="info-value">Phone: ${bill.client_phone}</div>`
                  : ""
              }
            </div>
            <div class="info-section" style="text-align: right;">
              <div class="info-label">Invoice #${billId}</div>
              <div class="info-value">Date: ${formatDate(
                bill?.date_issued || ""
              )}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${particulars
                .map(
                  ([name, rate, qty], index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${name}</td>
                  <td class="text-right">₹${rate.toFixed(2)}</td>
                  <td class="text-right">${qty}</td>
                  <td class="text-right">₹${(rate * qty).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <div class="total-label">Subtotal:</div>
              <div class="total-value">₹${subtotal.toFixed(2)}</div>
            </div>
            ${
              discount > 0
                ? `
              <div class="total-row">
                <div class="total-label">Discount:</div>
                <div class="total-value">- ₹${discount.toFixed(2)}</div>
              </div>
            `
                : ""
            }
            <div class="total-row grand-total">
              <div class="total-label">Total:</div>
              <div class="total-value">₹${total.toFixed(2)}</div>
            </div>
          </div>

          <div class="footer">
            Thank you for your business!
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Bill not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice #{billId}</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
          <Ionicons name="create-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <Ionicons name="download-outline" size={22} color="#007AFF" />
          <Text style={styles.actionButtonText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color="#007AFF" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
          <Ionicons name="print-outline" size={22} color="#007AFF" />
          <Text style={styles.actionButtonText}>Print</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View ref={viewRef} style={styles.invoice} collapsable={false}>
          {/* Business Info */}
          <View style={styles.invoiceHeader}>
            <Text style={styles.businessName}>
              {businessInfo?.business_name || "INVOICE"}
            </Text>
            {businessInfo?.business_addr && (
              <Text style={styles.businessDetail}>
                {businessInfo.business_addr}
              </Text>
            )}
            {businessInfo?.phone_number && (
              <Text style={styles.businessDetail}>
                Phone: {businessInfo.phone_number}
              </Text>
            )}
            {businessInfo?.gstin && (
              <Text style={styles.businessDetail}>
                GSTIN: {businessInfo.gstin}
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Bill Info */}
          <View style={styles.billInfoSection}>
            <View style={styles.billInfoLeft}>
              <Text style={styles.infoLabel}>Bill To:</Text>
              <Text style={styles.infoValue}>{bill.client_name}</Text>
              {bill.client_phone && (
                <Text style={styles.infoValueSmall}>
                  Phone: {bill.client_phone}
                </Text>
              )}
            </View>
            <View style={styles.billInfoRight}>
              <Text style={styles.infoLabel}>Invoice #</Text>
              <Text style={styles.invoiceNumber}>{billId}</Text>
              <Text style={styles.infoValueSmall}>
                {formatDate(bill.date_issued!)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Items Table */}
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colSr]}>#</Text>
              <Text style={[styles.tableHeaderText, styles.colItem]}>
                Description
              </Text>
              <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
              <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.colAmount]}>
                Amount
              </Text>
            </View>

            {particulars.map(([name, rate, qty], index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colSr]}>
                  {index + 1}
                </Text>
                <Text style={[styles.tableCell, styles.colItem]}>{name}</Text>
                <Text style={[styles.tableCell, styles.colRate]}>
                  ₹{rate.toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>{qty}</Text>
                <Text style={[styles.tableCell, styles.colAmount]}>
                  ₹{(rate * qty).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>
                ₹{calculateSubtotal().toFixed(2)}
              </Text>
            </View>

            {bill.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>
                  - ₹{bill.discount.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                ₹{bill.total_amount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.invoiceFooter}>
            <Text style={styles.footerText}>Thank you for your business!</Text>
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
    headerButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    headerSpacer: {
      width: 32,
    },
    actionBar: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.15),
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#007AFF",
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    invoice: {
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      padding: 24,
      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    invoiceHeader: {
      alignItems: "center",
      marginBottom: 24,
    },
    businessName: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#000000",
      marginBottom: 8,
    },
    businessDetail: {
      fontSize: 10,
      color: "#666666",
      marginBottom: 2,
      textAlign: "center",
    },
    divider: {
      height: 1,
      backgroundColor: hexToRGBA(colors.text, 0.15),
      marginVertical: 16,
    },
    billInfoSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    billInfoLeft: {
      flex: 1,
    },
    billInfoRight: {
      alignItems: "flex-end",
    },
    infoLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: "#8E8E93",
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 12,
      fontWeight: "600",
      color: "#000000",
      marginBottom: 2,
    },
    infoValueSmall: {
      fontSize: 10,
      color: "#666666",
    },
    invoiceNumber: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#007AFF",
      marginBottom: 4,
    },
    itemsTable: {
      marginBottom: 8,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: hexToRGBA("#000000", 0.1),
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      marginBottom: 8,
    },
    tableHeaderText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#000000",
      textTransform: "uppercase",
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: hexToRGBA(colors.text, 0.2),
    },
    tableCell: {
      fontSize: 10,
      color: "#000000",
    },
    colSr: {
      width: "8%",
    },
    colItem: {
      width: "40%",
    },
    colRate: {
      width: "18%",
      textAlign: "right",
    },
    colQty: {
      width: "12%",
      textAlign: "center",
    },
    colAmount: {
      width: "22%",
      textAlign: "right",
      fontWeight: "600",
    },
    totalsSection: {
      alignItems: "flex-end",
      marginBottom: 12,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: 200,
    },
    totalLabel: {
      fontSize: 12,
      color: "#000000",
    },
    totalValue: {
      fontSize: 13,
      fontWeight: "600",
      color: "#000000",
    },
    grandTotalRow: {},
    grandTotalLabel: {
      fontSize: 13,
      fontWeight: "bold",
      color: "#000000",
    },
    grandTotalValue: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#007AFF",
    },
    invoiceFooter: {
      alignItems: "center",
      marginTop: 12,
    },
    footerText: {
      fontSize: 8,
      color: "#8E8E93",
      fontStyle: "italic",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    errorText: {
      fontSize: 18,
      color: "#8E8E93",
      marginBottom: 24,
    },
    backButton: {
      backgroundColor: "#007AFF",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.background,
    },
  });
