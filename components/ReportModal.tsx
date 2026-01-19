import { supabase } from "@/lib/supabase";
import { Flag, X } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reporterId: string;
  reportedId: string;
  reportedName: string;
  type: "user" | "donation" | "campaign" | "request";
}

const typeOptions = [
  { label: "User", value: "user" },
  { label: "Donation", value: "donation" },
  { label: "Campaign", value: "campaign" },
  { label: "Request", value: "request" },
];

const reasons = [
  "Inappropriate content",
  "Spam or misleading information",
  "Harassment or abuse",
  "Fraud or scam",
  "Violation of terms",
  "Other",
];

export default function ReportModal({
  visible,
  onClose,
  reporterId,
  reportedId,
  reportedName,
  type: initialType,
}: ReportModalProps) {
  const [selectedType, setSelectedType] = useState(initialType);
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType || !selectedReason || !reporterId || !reportedId) {
      Alert.alert("Error", "Please fill all required fields.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      type: selectedType,
      reason: selectedReason,
      description: description.trim() || null,
    });

    console.log(error);
    setLoading(false);
    if (error) {
      Alert.alert("Error", "Failed to submit report.");
    } else {
      Alert.alert("Success", "Report submitted.");
      setSelectedType(initialType);
      setSelectedReason("");
      setDescription("");
      onClose();
    }
  };

  if (!visible) return null;

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
              <Flag size={24} color="#EF4444" />
              <Text style={styles.title}>Report</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Report {reportedName}</Text>
          <ScrollView>
            <Text style={styles.label}>Type *</Text>
            <View style={styles.row}>
              {typeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.typeBtn,
                    selectedType === opt.value && styles.typeBtnActive,
                  ]}
                  onPress={() =>
                    setSelectedType(
                      opt.value as "user" | "donation" | "campaign" | "request"
                    )
                  }
                >
                  <Text
                    style={
                      selectedType === opt.value
                        ? styles.typeBtnTextActive
                        : styles.typeBtnText
                    }
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Reason *</Text>
            {reasons.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonBtn,
                  selectedReason === reason && styles.reasonBtnActive,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text
                  style={
                    selectedReason === reason
                      ? styles.reasonBtnTextActive
                      : styles.reasonBtnText
                  }
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Add details..."
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submit, loading && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? "Submitting..." : "Submit"}
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
    padding: 20,
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EF4444",
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#1F2937",
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  label: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  typeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    marginBottom: 8,
  },
  typeBtnActive: {
    backgroundColor: "#2563EB",
  },
  typeBtnText: {
    color: "#1F2937",
  },
  typeBtnTextActive: {
    color: "#fff",
  },
  reasonBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginBottom: 8,
  },
  reasonBtnActive: {
    backgroundColor: "#EF4444",
  },
  reasonBtnText: {
    color: "#1F2937",
  },
  reasonBtnTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  textarea: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    textAlignVertical: "top",
    minHeight: 80,
    backgroundColor: "#fff",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  cancel: {
    marginRight: 16,
    padding: 10,
  },
  cancelText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  submit: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    padding: 10,
    minWidth: 80,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
