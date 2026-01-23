import ReportModal from "@/components/ReportModal";
import ReviewModal from "@/components/ReviewModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { useRouter } from "expo-router";
import {
    AlertCircle,
    Clock,
    Filter,
    Flag,
    MapPin,
    Search,
    Star,
    User,
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
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Donation = Database["public"]["Tables"]["donations"]["Row"] & {
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  ratings?: {
    rating: number;
    comment: string | null;
  }[];
};

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [reviewModal, setReviewModal] = useState({
    visible: false,
    donorId: "",
    donorName: "",
    donationId: "",
  });
  const [reportModal, setReportModal] = useState<{
    visible: boolean;
    reportedId: string;
    reportedName: string;
    type: "user" | "donation" | "campaign" | "request";
  }>({
    visible: false,
    reportedId: "",
    reportedName: "",
    type: "donation",
  });

  const categories = [
    "All",
    "Food",
    "Clothing",
    "Electronics",
    "Books",
    "Furniture",
    "Other",
  ];

  useEffect(() => {
    fetchDonations();
  }, [profile?.role]);

  const fetchDonations = async () => {
    try {
      let query = supabase
        .from("donations")
        .select(
          `
          *,
          profiles:donor_id (
            full_name,
            avatar_url
          ),
          ratings (
            rating,
            comment
          )
        `
        )
        .order("created_at", { ascending: false });

      if (profile?.role === "donor") {
        query = query.eq("donor_id", profile.id);
      } else {
        query = query.eq("status", "available");
      }

      const { data, error } = await query;

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error("Error fetching donations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDonations();
  };

  const handleRequestDonation = async (donationId: string) => {
    if (!profile) return;

    Alert.prompt(
      "Request Donation",
      "Send a message to the donor explaining why you need this item:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Request",
          onPress: async (message) => {
            if (!message?.trim()) return;

            try {
              const MACHINE_IP = "192.168.1.3";
              const requestServiceUrl = process.env.EXPO_PUBLIC_REQUEST_SERVICE_URL || 
                (Platform.OS === 'android' || Platform.OS === 'ios' ? `http://${MACHINE_IP}:3004` : "http://localhost:3004");
              
              // Check if request already exists via API
              const checkResponse = await fetch(
                `${requestServiceUrl}/api/requests?donation_id=${donationId}&recipient_id=${profile.id}`
              );
              
              if (checkResponse.ok) {
                const existingRequests = await checkResponse.json();
                if (existingRequests && existingRequests.length > 0) {
                  const existingRequest = existingRequests[0];
                  const statusMessage = existingRequest.status === "pending" 
                    ? "You have already sent a request for this donation. It is pending approval."
                    : existingRequest.status === "approved"
                    ? "Your request for this donation has already been approved."
                    : "Your request for this donation was rejected.";
                  Alert.alert("Request Already Exists", statusMessage);
                  return;
                }
              }

              // Create request via API
              const response = await fetch(`${requestServiceUrl}/api/requests`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  donation_id: donationId,
                  recipient_id: profile.id,
                  message: message.trim(),
                }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Failed to send request" }));
                if (errorData.error && errorData.error.includes("already exists")) {
                  Alert.alert("Request Already Exists", "You have already sent a request for this donation.");
                } else {
                  throw new Error(errorData.error || `Failed to send request: ${response.status}`);
                }
                return;
              }
              Alert.alert("Success", "Request sent successfully!");
            } catch (error: any) {
              console.error("Error sending request:", error);
              Alert.alert("Error", error.message || "Failed to send request");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleReviewDonor = (
    donationId: string,
    donorId: string,
    donorName: string
  ) => {
    setReviewModal({
      visible: true,
      donationId,
      donorId,
      donorName,
    });
  };

  const handleReportUser = (userId: string, userName: string) => {
    setReportModal({
      visible: true,
      reportedId: userId,
      reportedName: userName,
      type: "user",
    });
  };

  const handleReportDonation = (donationId: string, donationTitle: string) => {
    setReportModal({
      visible: true,
      reportedId: donationId,
      reportedName: donationTitle,
      type: "donation",
    });
  };

  const handleViewDetails = (donation: Donation) => {
    router.push({
      pathname: "/donation-details",
      params: {
        id: donation.id,
        title: donation.title,
        description: donation.description,
        category: donation.category,
        location: donation.location,
        imageUrl: donation.image_url || "",
        status: donation.status,
        createdAt: donation.created_at,
        donorName: donation.profiles?.full_name || "",
        donorId: donation.donor_id,
      },
    });
  };

  const filteredDonations = donations.filter((donation) => {
    const matchesSearch =
      donation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      donation.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || donation.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderDonationCard = ({ item }: { item: Donation }) => {
    const averageRating =
      item.ratings && item.ratings.length > 0
        ? item.ratings.reduce((sum, rating) => sum + rating.rating, 0) /
          item.ratings.length
        : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleViewDetails(item)}
      >
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>

          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.locationContainer}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
            <View style={styles.timeContainer}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.donorInfo}>
            <View style={styles.donorDetails}>
              <Text style={styles.donorName}>
                by {item.profiles?.full_name}
              </Text>
              {item.ratings && item.ratings.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginLeft: 6,
                  }}
                >
                  <Star size={14} color="#F59E0B" fill="#F59E0B" />
                  <Text
                    style={{
                      marginLeft: 2,
                      color: "#F59E0B",
                      fontWeight: "bold",
                      fontSize: 13,
                    }}
                  >
                    {(
                      item.ratings.reduce((sum, r) => sum + r.rating, 0) /
                      item.ratings.length
                    ).toFixed(1)}
                  </Text>
                  <Text
                    style={{ marginLeft: 4, color: "#F59E0B", fontSize: 13 }}
                  >
                    ({item.ratings.length})
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={{
                  marginLeft: 6,
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  setReviewModal({
                    visible: true,
                    donorId: item.donor_id,
                    donorName: item.profiles?.full_name || "",
                    donationId: item.id,
                  });
                }}
              >
                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                <Text
                  style={{
                    marginLeft: 2,
                    color: "#F59E0B",
                    fontWeight: "bold",
                  }}
                >
                  Reviews
                  {item.ratings &&
                    item.ratings.length > 0 &&
                    ` (${item.ratings.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtons}>
              {/* {profile?.role === "recipient" && item.status === "available" && (
                <TouchableOpacity
                  style={styles.requestButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRequestDonation(item.id);
                  }}
                >
                  <MessageCircle size={16} color="#2563EB" />
                  <Text style={styles.requestButtonText}>Request</Text>
                </TouchableOpacity>
              )} */}

              {profile?.role === "recipient" && item.status === "completed" && (
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleReviewDonor(
                      item.id,
                      item.donor_id,
                      item.profiles?.full_name || ""
                    );
                  }}
                >
                  <Star size={16} color="#F59E0B" />
                  <Text style={styles.reviewButtonText}>
                    Review // add total reviews in star rating
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.reportButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleReportDonation(item.id, item.profiles?.full_name || "");
                }}
              >
                <Flag size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "#10B981";
      case "claimed":
        return "#F59E0B";
      case "completed":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {profile?.role === "donor" ? "My Donations" : "Available Donations"}
        </Text>

        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={[styles.searchInput, { color: "#1F2937" }]}
            placeholder="Search donations..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          data={categories}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === item && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === item && styles.categoryButtonTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
      </View>

      {/* Approval message for unapproved recipients */}
      {profile?.role === "recipient" &&
        profile.recipient_status !== "approved" && (
          <View style={styles.approvalRequiredContainerCentered}>
            <AlertCircle
              size={32}
              color="#EF4444"
              style={{ marginBottom: 12 }}
            />
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
              <Text style={styles.approvalButtonTextCentered}>
                Go to Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}

      <ReviewModal
        visible={reviewModal.visible}
        onClose={() => setReviewModal({ ...reviewModal, visible: false })}
        donationId={reviewModal.donationId}
        donorId={reviewModal.donorId}
        recipientId={profile?.id || ""}
        donorName={reviewModal.donorName}
      />

      <ReportModal
        visible={reportModal.visible}
        onClose={() => setReportModal({ ...reportModal, visible: false })}
        reporterId={profile?.id || ""}
        reportedId={reportModal.reportedId}
        reportedName={reportModal.reportedName}
        type={reportModal.type}
      />

      {(profile?.role !== "recipient" ||
        profile.recipient_status === "approved") && (
        <FlatList
          data={filteredDonations}
          renderItem={renderDonationCard}
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
                {profile?.role === "donor"
                  ? "No donations yet. Create your first donation!"
                  : "No donations available at the moment."}
              </Text>
            </View>
          }
        />
      )}
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
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  filterButton: {
    padding: 4,
  },
  categoriesContainer: {
    paddingHorizontal: 0,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#F3F4F6",
  },
  categoryButtonActive: {
    backgroundColor: "#2563EB",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  categoryButtonTextActive: {
    color: "#ffffff",
  },
  listContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
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
  cardImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ffffff",
    textTransform: "capitalize",
  },
  cardDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  donorInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  donorDetails: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  donorName: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "500",
    marginLeft: 2,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requestButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  requestButtonText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
    marginLeft: 4,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reviewButtonText: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "500",
    marginLeft: 4,
  },
  reportButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
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
