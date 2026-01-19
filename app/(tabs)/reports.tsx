import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { Eye, Flag, Star, Trash2, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReportsScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReporter, setSelectedReporter] = useState<any>(null);
  const [showReporterModal, setShowReporterModal] = useState(false);

  useEffect(() => {
    if (profile?.role !== "admin") {
      router.replace("/(tabs)");
      return;
    }
    fetchReports();
  }, [profile]);

  useEffect(() => {
    console.log("selectedReporter state changed:", selectedReporter);
  }, [selectedReporter]);

  useEffect(() => {
    console.log("showReporterModal state changed:", showReporterModal);
  }, [showReporterModal]);

  useEffect(() => {
    console.log("=== State Debug ===");
    console.log("selectedReporter:", selectedReporter);
    console.log("showReporterModal:", showReporterModal);
    console.log("selectedReporter type:", typeof selectedReporter);
    console.log("selectedReporter truthy:", !!selectedReporter);
  }, [selectedReporter, showReporterModal]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      console.log("All reports data:", data);
      console.log("Number of reports:", data?.length);

      setReports(data || []);
      // Note: We can't fetch blocked status since 'blocked' field doesn't exist in profiles table
      // We'll handle this differently or remove this functionality
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (type: string, id: string) => {
    try {
      let table = "";
      if (type === "user") table = "profiles";
      if (type === "campaign") table = "campaigns";
      if (type === "donation") table = "donations";
      if (type === "request") table = "requests";
      if (!table) return;

      console.log("table", table, "id", id);

      const { error, count } = await supabase.from(table).delete().eq("id", id);

      if (error) throw error;
      if (count === 0) {
        Alert.alert("Error", "No rows were deleted. Check RLS or ID.");
        return;
      }
      Alert.alert(
        "Success",
        `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`
      );
      fetchReports();
    } catch (error) {
      console.error("Error deleting:", error);
      Alert.alert("Error", `Failed to delete ${type}`);
    }
  };

  const handleViewReporter = async (reporterId: string) => {
    try {
      console.log("=== handleViewReporter called ===");
      console.log("Fetching reporter details for ID:", reporterId);
      console.log("Current user ID:", profile?.id);
      console.log("Current user role:", profile?.role);

      // First, let's check if we can read the reports table
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("reporter_id", reporterId)
        .limit(1);

      console.log("Report data for this reporter:", reportData);
      console.log("Report error:", reportError);

      // Test admin access first
      const { data: adminTest, error: adminError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", profile?.id)
        .single();

      console.log("Admin test result:", { adminTest, adminError });

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", reporterId)
        .single();

      console.log("Profile fetch result:", { data, error });

      if (error) {
        console.error("Supabase error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);

        // If it's a permission error, show a message about RLS
        if (error.code === "PGRST116" || error.message.includes("permission")) {
          Alert.alert(
            "Permission Denied",
            "Unable to fetch reporter details due to database permissions. This is likely due to Row Level Security (RLS) policies. Please contact your database administrator to add admin policies for profile access."
          );
          return;
        }
        throw error;
      }

      console.log("Reporter data fetched:", data);
      console.log("About to set selectedReporter to:", data);

      // Set the state immediately
      setSelectedReporter(data);
      setShowReporterModal(true);

      console.log("State updates queued");

      // Add a small delay to see if state updates are working
      setTimeout(() => {
        console.log("After timeout - selectedReporter:", selectedReporter);
        console.log("After timeout - showReporterModal:", showReporterModal);
      }, 100);
    } catch (error) {
      console.error("Error fetching reporter details:", error);
      Alert.alert("Error", "Failed to fetch reporter details");
    }
  };

  const testProfileAccess = async () => {
    try {
      console.log("Testing profile access for current user:", profile?.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile?.id)
        .single();

      console.log("Own profile fetch result:", { data, error });
      Alert.alert(
        "Test Result",
        error ? `Error: ${error.message}` : "Success: Can fetch own profile"
      );
    } catch (error) {
      console.error("Test error:", error);
      Alert.alert("Test Error", "Failed to test profile access");
    }
  };

  const renderReports = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Reports Feed</Text>
      {reports.length === 0 ? (
        <Text style={styles.emptyText}>No reports found</Text>
      ) : (
        reports.map((report) => (
          <View key={report.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Flag size={18} color="#F59E0B" />
              <Text style={styles.cardTitle}>Type: {report.type}</Text>
              <Text style={styles.cardSubtitle}>Reason: {report.reason}</Text>
            </View>
            <Text style={styles.cardDescription}>{report.description}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRemove(report.type, report.reported_id)}
              >
                <Trash2 size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleViewReporter(report.reporter_id)}
              >
                <Eye size={16} color="#fff" />
                <Text style={styles.actionButtonText}>View Reporter</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (profile?.role !== "admin") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Access Denied</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.emptyText}>
            You need admin privileges to access this page.
          </Text>
          <Text style={styles.emptyText}>
            Current role: {profile?.role || "Unknown"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
      </View>
      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
        ) : (
          renderReports()
        )}
      </ScrollView>

      {/* Reporter Details Modal */}
      <Modal
        visible={showReporterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReporterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reporter Details</Text>
              <TouchableOpacity
                onPress={() => setShowReporterModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, minHeight: 200 }}>
              <ScrollView
                style={[styles.modalBody]}
                contentContainerStyle={{ paddingBottom: 12, paddingTop: 8 }}
              >
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>
                    {selectedReporter?.full_name || "Not provided"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>
                    {selectedReporter?.email || "Not provided"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>
                    {selectedReporter?.phone || "Not provided"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Role:</Text>
                  <Text style={styles.detailValue}>
                    {selectedReporter?.role || "User"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>
                    {selectedReporter?.recipient_status || "Active"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Joined:</Text>
                  <Text style={styles.detailValue}>
                    {selectedReporter?.created_at
                      ? new Date(
                          selectedReporter.created_at
                        ).toLocaleDateString()
                      : "-"}
                  </Text>
                </View>
                {selectedReporter?.location && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailValue}>
                      {selectedReporter.location}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 16,
    marginTop: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  cardDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  loader: {
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    width: "90%",
    maxHeight: "90%",
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    padding: 8,
  },
  modalBody: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  detailLabel: {
    fontWeight: "600",
    color: "#1F2937",
    marginRight: 2,
    minWidth: 80,
  },
  detailValue: {
    color: "#6B7280",
    flex: 1,
  },
});

export function RatingForm({
  donationId,
  donorId,
  recipientId,
  onRated,
}: {
  donationId: string;
  donorId: string;
  recipientId: string;
  onRated?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const submitRating = async () => {
    if (!rating) {
      Alert.alert("Please select a rating.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("ratings").insert({
      donation_id: donationId,
      donor_id: donorId,
      recipient_id: recipientId,
      rating,
      comment: comment.trim() || null,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Error", "Failed to submit rating.");
    } else {
      Alert.alert("Thank you!", "Your rating has been submitted.");
      onRated?.();
    }
  };

  return (
    <View style={{ marginVertical: 16 }}>
      <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
        Rate the Donor
      </Text>
      <View style={{ flexDirection: "row", marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Star
              size={32}
              color={star <= rating ? "#F59E0B" : "#D1D5DB"}
              fill={star <= rating ? "#F59E0B" : "none"}
            />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        placeholder="Leave a comment (optional)"
        value={comment}
        onChangeText={setComment}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 8,
          marginBottom: 8,
        }}
        multiline
      />
      <TouchableOpacity
        onPress={submitRating}
        style={{
          backgroundColor: "#2563EB",
          padding: 12,
          borderRadius: 8,
          alignItems: "center",
        }}
        disabled={loading}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          {loading ? "Submitting..." : "Submit Rating"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
