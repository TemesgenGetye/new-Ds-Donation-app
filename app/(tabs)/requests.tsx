import ReportModal from "@/components/ReportModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Clock,
  Flag,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  User,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Request = Database["public"]["Tables"]["requests"]["Row"] & {
  donations: {
    title: string;
    image_url: string | null;
    status: string;
  };
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  donor_profile?: {
    email: string;
    phone: string | null;
    location: string | null;
    full_name: string;
  };
};

export default function RequestsScreen() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportModal, setReportModal] = useState<{
    visible: boolean;
    reportedId: string;
    reportedName: string;
    type: "user" | "donation" | "campaign" | "request";
  }>({
    visible: false,
    reportedId: "",
    reportedName: "",
    type: "request",
  });
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (profile?.id) {
      fetchRequests();
    } else {
      setLoading(false);
    }
  }, [profile?.id, profile?.role]);

  const fetchRequests = async () => {
    if (!profile?.id) {
      console.log("No profile ID available");
      setRequests([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log(
        "Fetching requests for profile:",
        profile.id,
        "role:",
        profile.role
      );

      let query = supabase
        .from("requests")
        .select(
          `
          *,
          donations (
            title,
            image_url,
            status
          ),
          profiles:recipient_id (
            full_name,
            avatar_url
          )
        `
        )
        .order("created_at", { ascending: false });

      if (profile.role === "donor") {
        // Show requests for donor's donations
        const { data: donorDonations, error: donationsError } = await supabase
          .from("donations")
          .select("id")
          .eq("donor_id", profile.id);

        if (donationsError) {
          console.error("Error fetching donor donations:", donationsError);
          throw donationsError;
        }

        const donationIds = donorDonations?.map((d) => d.id) || [];
        console.log("Donor donation IDs:", donationIds);

        if (donationIds.length > 0) {
          query = query.in("donation_id", donationIds);
        } else {
          console.log("No donations found for donor");
          setRequests([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      } else {
        // Show recipient's own requests
        query = query.eq("recipient_id", profile.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching requests:", error);
        throw error;
      }

      // For recipients, fetch donor information for approved requests
      if (profile.role === "recipient" && data && data.length > 0) {
        const requestsWithDonorInfo = await Promise.all(
          data.map(async (request) => {
            if (request.status === "approved") {
              // Get donation to find donor_id
              const { data: donation } = await supabase
                .from("donations")
                .select("donor_id")
                .eq("id", request.donation_id)
                .single();

              if (donation) {
                // Get donor profile
                const { data: donorProfile } = await supabase
                  .from("profiles")
                  .select("email, phone, location, full_name")
                  .eq("id", donation.donor_id)
                  .single();

                return {
                  ...request,
                  donor_profile: donorProfile,
                };
              }
            }
            return request;
          })
        );

        console.log("Requests with donor info:", requestsWithDonorInfo.length);
        setRequests(requestsWithDonorInfo);
      } else {
        console.log("Requests fetched:", data?.length || 0);
        setRequests(data || []);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      Alert.alert("Error", "Failed to fetch requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const getRequestServiceUrl = (): string => {
    const MACHINE_IP = "192.168.1.3";
    if (process.env.EXPO_PUBLIC_REQUEST_SERVICE_URL && process.env.EXPO_PUBLIC_REQUEST_SERVICE_URL !== "http://localhost:3004") {
      return process.env.EXPO_PUBLIC_REQUEST_SERVICE_URL;
    }
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return `http://${MACHINE_IP}:3004`;
    }
    return "http://localhost:3004";
  };

  const getDonationServiceUrl = (): string => {
    const MACHINE_IP = "192.168.1.3";
    if (process.env.EXPO_PUBLIC_DONATION_SERVICE_URL && process.env.EXPO_PUBLIC_DONATION_SERVICE_URL !== "http://localhost:3001") {
      return process.env.EXPO_PUBLIC_DONATION_SERVICE_URL;
    }
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return `http://${MACHINE_IP}:3001`;
    }
    return "http://localhost:3001";
  };

  const handleRequestAction = async (
    requestId: string,
    action: "approved" | "rejected"
  ) => {
    try {
      // Call request-service API to update status (this will publish RabbitMQ events)
      const requestServiceUrl = getRequestServiceUrl();
      const response = await fetch(`${requestServiceUrl}/api/requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: action,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update request" }));
        throw new Error(errorData.error || `Failed to update request: ${response.status}`);
      }

      // Update local state
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: action } : req
        )
      );

      Alert.alert("Success", `Request ${action} successfully!`);
    } catch (error: any) {
      console.error("Error updating request:", error);
      Alert.alert("Error", error.message || "Failed to update request");
    }
  };

  const handleCompleteDonation = async (request: Request) => {
    try {
      // Call donation-service API to update status (this will publish RabbitMQ events)
      const donationServiceUrl = getDonationServiceUrl();
      const response = await fetch(`${donationServiceUrl}/api/donations/${request.donation_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update donation" }));
        throw new Error(errorData.error || `Failed to update donation: ${response.status}`);
      }

      // Update local state to reflect the donation is completed
      setRequests((prev) =>
        prev.map((req) =>
          req.id === request.id
            ? { ...req, donations: { ...req.donations, status: "completed" } }
            : req
        )
      );

      Alert.alert("Success", "Donation marked as completed!");
    } catch (error: any) {
      console.error("Error completing donation:", error);
      Alert.alert("Error", error.message || "Failed to complete donation");
    }
  };

  const handleReportRequest = (request: Request) => {
    setReportModal({
      visible: true,
      reportedId: request.id,
      reportedName: request.donations?.title || "",
      type: "request",
    });
  };

  const renderRequestCard = ({ item }: { item: Request }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {item.donations?.image_url && (
          <Image
            source={{ uri: item.donations.image_url }}
            style={styles.itemImage}
          />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.itemTitle}>{item.donations?.title}</Text>
          <View style={styles.userInfo}>
            <User size={16} color="#6B7280" />
            <Text style={styles.userName}>
              {profile?.role === "donor"
                ? item.profiles?.full_name
                : "Your request"}
            </Text>
          </View>
          <View style={styles.timeInfo}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(
                item.donations?.status === "completed"
                  ? "completed"
                  : item.status
              ),
            },
          ]}
        >
          <Text style={styles.statusText}>
            {item.donations?.status === "completed" ? "completed" : item.status}
          </Text>
        </View>
      </View>

      <View style={styles.messageContainer}>
        <MessageSquare size={16} color="#6B7280" />
        <Text style={styles.messageText}>{item.message}</Text>
      </View>

      {/* Show completion message for completed donations */}
      {profile?.role === "recipient" &&
        item.donations?.status === "completed" && (
          <View style={styles.completionContainer}>
            <View style={styles.completionContent}>
              <Package size={20} color="#10B981" />
              <Text style={styles.completionText}>
                You have received the package
              </Text>
            </View>
          </View>
        )}

      {/* Show donor contact information for approved requests to recipients */}
      {profile?.role === "recipient" &&
        item.status === "approved" &&
        item.donations?.status !== "completed" &&
        item.donor_profile && (
          <View style={styles.contactContainer}>
            <Text style={styles.contactTitle}>Donor Contact Information</Text>
            <View style={styles.contactInfo}>
              <View style={styles.contactItem}>
                <User size={16} color="#2563EB" />
                <Text style={styles.contactText}>
                  {item.donor_profile.full_name}
                </Text>
              </View>
              {item.donor_profile.email && (
                <View style={styles.contactItem}>
                  <Mail size={16} color="#2563EB" />
                  <Text style={styles.contactText}>
                    {item.donor_profile.email}
                  </Text>
                </View>
              )}
              {item.donor_profile.phone && (
                <View style={styles.contactItem}>
                  <Phone size={16} color="#2563EB" />
                  <Text style={styles.contactText}>
                    {item.donor_profile.phone}
                  </Text>
                </View>
              )}
              {item.donor_profile.location && (
                <View style={styles.contactItem}>
                  <MapPin size={16} color="#2563EB" />
                  <Text style={styles.contactText}>
                    {item.donor_profile.location}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

      {profile?.role === "donor" && item.status === "pending" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleRequestAction(item.id, "approved")}
          >
            <Check size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRequestAction(item.id, "rejected")}
          >
            <X size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.reportButton]}
            onPress={() => handleReportRequest(item)}
          >
            <Flag size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Report</Text>
          </TouchableOpacity>
        </View>
      )}

      {profile?.role === "donor" &&
        item.status === "approved" &&
        item.donations?.status !== "completed" && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleCompleteDonation(item)}
            >
              <CheckCircle size={16} color="#ffffff" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.reportButton]}
              onPress={() => handleReportRequest(item)}
            >
              <Flag size={16} color="#ffffff" />
              <Text style={styles.actionButtonText}>Report</Text>
            </TouchableOpacity>
          </View>
        )}
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F59E0B";
      case "approved":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      case "completed":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  if (
    profile?.role === "recipient" &&
    profile.recipient_status !== "approved"
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {profile?.role === "donor" ? "Donation Requests" : "My Requests"}
          </Text>
        </View>
        <View style={styles.approvalRequiredContainerCentered}>
          <AlertCircle size={32} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.approvalRequiredTitleCentered}>
            Profile Approval Required
          </Text>
          <Text style={styles.approvalRequiredTextCentered}>
            Please upload a verification image in your profile to get approved
            and request donations.
          </Text>
          <TouchableOpacity
            style={styles.approvalButtonCentered}
            onPress={() => router.push("/profile")}
          >
            <User size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.approvalButtonTextCentered}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state while profile is being fetched
  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {profile.role === "donor" ? "Donation Requests" : "My Requests"}
        </Text>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequestCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563EB"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {profile.role === "donor"
                ? "No requests for your donations yet."
                : "You haven't made any requests yet."}
            </Text>
          </View>
        }
      />

      <ReportModal
        visible={reportModal.visible}
        onClose={() => setReportModal({ ...reportModal, visible: false })}
        reporterId={profile?.id || ""}
        reportedId={reportModal.reportedId}
        reportedName={reportModal.reportedName}
        type={reportModal.type}
      />
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
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  listContainer: {
    padding: 20,
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
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  timeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ffffff",
    textTransform: "capitalize",
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    gap: 8,
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  reportButton: {
    backgroundColor: "#F59E0B",
  },
  completeButton: {
    backgroundColor: "#10B981",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  reportInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  submitButton: {
    backgroundColor: "#EF4444",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  contactContainer: {
    padding: 12,
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  contactInfo: {
    gap: 8,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  completionContainer: {
    padding: 12,
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  completionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  completionText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
  approvalRequiredContainerCentered: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginBottom: 20,
    marginHorizontal: 0,
  },
  approvalRequiredTitleCentered: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
    textAlign: "center",
  },
  approvalRequiredTextCentered: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  approvalButtonCentered: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  approvalButtonTextCentered: {
    fontSize: 15,
    color: "#ffffff",
    fontWeight: "600",
  },
});
