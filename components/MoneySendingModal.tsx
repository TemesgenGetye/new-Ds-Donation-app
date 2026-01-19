import { supabase } from "@/lib/supabase";
import { DollarSign, X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface MoneySendingModalProps {
  visible: boolean;
  onClose: () => void;
  campaignId: string;
  campaignTitle: string;
  recipientName: string;
  goalAmount: number;
  currentCollectedAmount: number;
  onMoneySent?: () => void;
}

const banks = [
  { id: "cbe", name: "Commercial Bank of Ethiopia", icon: "🏦" },
  { id: "awash", name: "Awash Bank", icon: "🏦" },
  { id: "dashen", name: "Dashen Bank", icon: "🏦" },
  { id: "bank_of_abyssinia", name: "Bank of Abyssinia", icon: "🏦" },
  { id: "telebirr", name: "Telebirr", icon: "📱" },
  { id: "cbe_birr", name: "CBE Birr", icon: "📱" },
  { id: "m_pesa", name: "M-Pesa", icon: "📱" },
];

export default function MoneySendingModal({
  visible,
  onClose,
  campaignId,
  campaignTitle,
  recipientName,
  goalAmount,
  currentCollectedAmount,
  onMoneySent,
}: MoneySendingModalProps) {
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendMoney = async () => {
    if (!selectedBank || !accountNumber || !amount) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (numAmount > goalAmount - currentCollectedAmount) {
      Alert.alert("Error", "Amount exceeds the remaining goal amount");
      return;
    }

    setLoading(true);

    try {
      // Update the campaign's collected amount
      const newCollectedAmount = (currentCollectedAmount || 0) + numAmount;

      // First, let's try to get the current campaign to see if we can access it
      const { data: currentCampaign, error: fetchError } = await supabase
        .from("campaigns")
        .select("collected_amount, recipient_id")
        .eq("id", campaignId)
        .single();

      if (fetchError) {
        console.error("Error fetching campaign:", fetchError);
        throw fetchError;
      }

      console.log("Current campaign data:", currentCampaign);

      // Now try to update
      const { data, error } = await supabase
        .from("campaigns")
        .update({
          collected_amount: newCollectedAmount,
        })
        .eq("id", campaignId)
        .select("id, collected_amount, updated_at");

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        // Try to get more specific error information
        if (error.code === "42501") {
          Alert.alert(
            "Permission Error",
            "You don't have permission to update this campaign. This might be due to Row Level Security (RLS) policies."
          );
        } else {
          Alert.alert("Database Error", `Error: ${error.message}`);
        }
        throw error;
      }

      console.log("Update successful:", data);

      Alert.alert(
        "Success",
        `Successfully sent $${numAmount.toFixed(2)} to ${recipientName} via ${
          banks.find((b) => b.id === selectedBank)?.name
        }`
      );

      // Call the callback to refresh the campaigns list
      onMoneySent?.();

      // Reset form
      setSelectedBank("");
      setAccountNumber("");
      setAmount("");
      onClose();
    } catch (error) {
      console.error("Error sending money:", error);
      Alert.alert("Error", "Failed to send money. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const remainingAmount = goalAmount - (currentCollectedAmount || 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <DollarSign size={24} color="#10B981" />
              <Text style={styles.title}>Send Money</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.campaignTitle}>Campaign: {campaignTitle}</Text>
            <Text style={styles.recipientName}>Recipient: {recipientName}</Text>

            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Progress: ${currentCollectedAmount || 0} / ${goalAmount}
              </Text>
              <Text style={styles.remainingText}>
                Remaining: ${remainingAmount.toFixed(2)}
              </Text>
            </View>

            <Text style={styles.label}>Select Bank/Payment Method *</Text>

            <View style={styles.bankGrid}>
              {banks.map((bank) => (
                <TouchableOpacity
                  key={bank.id}
                  style={[
                    styles.bankOption,
                    selectedBank === bank.id && styles.bankOptionSelected,
                  ]}
                  onPress={() => setSelectedBank(bank.id)}
                >
                  <Text style={styles.bankIcon}>{bank.icon}</Text>
                  <Text
                    style={[
                      styles.bankName,
                      selectedBank === bank.id && styles.bankNameSelected,
                    ]}
                  >
                    {bank.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Account Number/Phone *</Text>
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Enter account number or phone number"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Amount (USD) *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder={`Enter amount (max: $${remainingAmount.toFixed(2)})`}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, loading && styles.sendButtonDisabled]}
              onPress={handleSendMoney}
              disabled={loading}
            >
              <Text style={styles.sendButtonText}>
                {loading ? "Sending..." : "Send Money"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 380,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    marginBottom: 12,
  },
  campaignTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  recipientName: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  progressContainer: {
    backgroundColor: "#F0F9FF",
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  remainingText: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
    marginBottom: 6,
  },
  bankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  bankOption: {
    width: "48%",
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 6,
  },
  bankOptionSelected: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  bankIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  bankName: {
    fontSize: 10,
    color: "#374151",
    textAlign: "center",
    fontWeight: "500",
  },
  bankNameSelected: {
    color: "#2563EB",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#ffffff",
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
  sendButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
