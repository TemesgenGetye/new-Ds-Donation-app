import MoneySendingModal from "@/components/MoneySendingModal";
import ReportModal from "@/components/ReportModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Database } from "@/types/database";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Clock,
  DollarSign,
  Filter,
  Flag,
  MapPin,
  Search,
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

type Campaign = Database["public"]["Tables"]["campaigns"]["Row"] & {
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
};

export default function CampaignsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [reportModal, setReportModal] = useState<{
    visible: boolean;
    reportedId: string;
    reportedName: string;
    type: "user" | "donation" | "campaign" | "request";
  }>({
    visible: false,
    reportedId: "",
    reportedName: "",
    type: "campaign",
  });
  const [moneyModal, setMoneyModal] = useState({
    visible: false,
    campaignId: "",
    campaignTitle: "",
    recipientName: "",
    goalAmount: 0,
    currentCollectedAmount: 0,
  });
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );

  const categories = [
    "All",
    "Food",
    "Clothing",
    "Electronics",
    "Books",
    "Furniture",
    "Medical",
    "Education",
    "Other",
  ];

  useEffect(() => {
    fetchCampaigns();
  }, [profile?.role]);

  const fetchCampaigns = async () => {
    try {
      // Use NEW campaign database directly (not old database)
      const campaignSupabaseUrl = process.env.EXPO_PUBLIC_CAMPAIGN_SUPABASE_URL || "https://xhkixkkslqvhkzsxddge.supabase.co";
      const campaignSupabaseKey = process.env.EXPO_PUBLIC_CAMPAIGN_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoa2l4a2tzbHF2aGt6c3hkZGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDY0NzYsImV4cCI6MjA4NDY4MjQ3Nn0.pE8N8sOIY2Sn4xMz2FRKceU7N-N7slEFxDEJdLTLu8A";
      const campaignSupabase = createClient(campaignSupabaseUrl, campaignSupabaseKey);
      
      let query = campaignSupabase.from("campaigns").select("*").order("created_at", { ascending: false });
      
      if (profile?.role === "recipient") {
        if (profile.recipient_status === "approved") {
          query = query.eq("recipient_id", profile.id);
        } else {
          query = query.eq("status", "active");
        }
      } else {
        query = query.eq("status", "active");
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profile data for each campaign from main database
      const campaignsWithProfiles = await Promise.all(
        (data || []).map(async (campaign: any) => {
          try {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", campaign.recipient_id)
              .single();
            
            return {
              ...campaign,
              profiles: profileData || { full_name: "Unknown", avatar_url: null },
            };
          } catch {
            return {
              ...campaign,
              profiles: { full_name: "Unknown", avatar_url: null },
            };
          }
        })
      );

      setCampaigns(campaignsWithProfiles);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCampaigns();
  };

  // Helper function to get messaging service URL (same pattern as campaign service)
  const getMessagingServiceUrl = (): string => {
    const MACHINE_IP = "192.168.1.3";
    if (process.env.EXPO_PUBLIC_MESSAGING_SERVICE_URL) {
      return process.env.EXPO_PUBLIC_MESSAGING_SERVICE_URL;
    }
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return `http://${MACHINE_IP}:3003`;
    }
    return "http://localhost:3003";
  };

  const handleMessageCampaign = async (campaign: Campaign) => {
    if (!profile) return;

    Alert.prompt(
      "Send Message",
      `Send a message to ${campaign.profiles?.full_name}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async (message) => {
            if (!message?.trim()) return;

            try {
              // Call messaging-service API instead of direct Supabase insert
              const messagingServiceUrl = getMessagingServiceUrl();
              const response = await fetch(`${messagingServiceUrl}/api/messages`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  campaign_id: campaign.id,
                  sender_id: profile.id,
                  receiver_id: campaign.recipient_id,
                  content: message.trim(),
                }),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Failed to send message" }));
                throw new Error(errorData.error || "Failed to send message");
              }

              Alert.alert("Success", "Message sent successfully!");
            } catch (error: any) {
              console.error("Error sending message:", error);
              Alert.alert("Error", error.message || "Failed to send message");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleReportCampaign = (campaignId: string, campaignTitle: string) => {
    setReportModal({
      visible: true,
      reportedId: campaignId,
      reportedName: campaignTitle,
      type: "campaign",
    });
  };

  const handleSendMoney = (campaign: Campaign) => {
    console.log("handleSendMoney called with campaign:", campaign);
    setMoneyModal({
      visible: true,
      campaignId: campaign.id,
      campaignTitle: campaign.title,
      recipientName: campaign.profiles?.full_name || "",
      goalAmount: campaign.goal_amount || 0,
      currentCollectedAmount: campaign.collected_amount || 0,
    });
    console.log("Money modal state set to visible");
  };

  const handleMoneySent = () => {
    // Refresh the campaigns list to show updated collected amounts
    console.log("Money sent, refreshing campaigns...");
    fetchCampaigns();
  };

  const handleViewDetails = (campaign: Campaign) => {
    router.push({
      pathname: "/campaing-details",
      params: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        category: campaign.category,
        location: campaign.location,
        goalAmount: campaign.goal_amount?.toString() || "",
        imageUrl: campaign.image_url || "",
        status: campaign.status,
        createdAt: campaign.created_at,
        recipientName: campaign.profiles?.full_name || "",
        recipientId: campaign.recipient_id,
      },
    });
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || campaign.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderCampaignCard = ({ item }: { item: Campaign }) => (
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

        <Text style={styles.cardDescription} numberOfLines={3}>
          {item.description}
        </Text>

        {item.goal_amount && (
          <View style={styles.goalContainer}>
            <DollarSign size={16} color="#10B981" />
            <Text style={styles.goalText}>
              ${item.collected_amount || 0} / ${item.goal_amount} raised
            </Text>
          </View>
        )}

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

        <Text style={styles.campaignOwner}>By {item.profiles?.full_name}</Text>
        <View style={styles.campaignInfo}>
          {profile?.role === "donor" && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.sendMoneyButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleSendMoney(item);
                }}
              >
                <DollarSign size={16} color="#ffffff" />
                <Text style={styles.sendMoneyButtonText}>Send Money</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleReportCampaign(item.id, item.title);
                }}
              >
                <Flag size={16} color="#EF4444" />
                <Text style={styles.reportButtonText}>Report</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#10B981";
      case "paused":
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
          {profile?.role === "recipient" &&
          profile.recipient_status === "approved"
            ? "My Campaigns"
            : "Active Campaigns"}
        </Text>

        {/* Search bar and selectors always visible */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={[styles.searchInput, { color: "#1F2937" }]}
            placeholderTextColor="#6B7280"
            placeholder="Search campaigns..."
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
              and create campaigns.
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

      {/* Only show campaign list and empty state if recipient is approved or not a recipient */}
      {(!profile ||
        profile.role !== "recipient" ||
        profile.recipient_status === "approved") && (
        <FlatList
          data={filteredCampaigns}
          renderItem={renderCampaignCard}
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
                {profile?.role === "recipient" &&
                profile.recipient_status === "approved"
                  ? "No campaigns yet. Create your first campaign!"
                  : "No active campaigns at the moment."}
              </Text>
            </View>
          }
        />
      )}

      <ReportModal
        visible={reportModal.visible}
        onClose={() => setReportModal({ ...reportModal, visible: false })}
        reporterId={profile?.id || ""}
        reportedId={reportModal.reportedId}
        reportedName={reportModal.reportedName}
        type={reportModal.type}
      />

      <MoneySendingModal
        visible={moneyModal.visible}
        onClose={() => setMoneyModal({ ...moneyModal, visible: false })}
        campaignId={moneyModal.campaignId}
        campaignTitle={moneyModal.campaignTitle}
        recipientName={moneyModal.recipientName}
        goalAmount={moneyModal.goalAmount}
        currentCollectedAmount={moneyModal.currentCollectedAmount}
        onMoneySent={handleMoneySent}
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
  goalContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  goalText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 4,
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
  campaignInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  campaignOwner: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  messageButtonText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reportButtonText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
    marginLeft: 4,
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
  sendMoneyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sendMoneyButtonText: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "500",
    marginLeft: 4,
  },
  approvalRequiredContainer: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  approvalContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  approvalIcon: {
    marginRight: 0,
  },
  approvalTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  approvalRequiredTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  approvalRequiredText: {
    fontSize: 14,
    color: "#6B7280",
  },
  approvalButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  approvalButtonText: {
    fontSize: 14,
    color: "#ffffff",
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
