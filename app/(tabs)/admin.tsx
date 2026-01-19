import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import {
  CheckCircle,
  Eye,
  Flag,
  Gift,
  Heart,
  LogOut,
  Trash2,
  Users,
  XCircle,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("verifications");
  const [loading, setLoading] = useState(false);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.role !== "admin") {
      router.replace("/(tabs)");
      return;
    }
    fetchData();
  }, [profile, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "verifications") {
        await fetchVerifications();
      } else if (activeTab === "campaigns") {
        await fetchCampaigns();
      } else if (activeTab === "donations") {
        await fetchDonations();
      } else if (activeTab === "reports") {
        await fetchReports();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifications = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("recipient_status", "requested")
      .not("verification_image_url", "is", null);

    if (error) {
      console.error("Error fetching verifications:", error);
      throw error;
    }
    console.log("Fetched verifications:", data);
    setVerifications(data || []);
  };

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from("campaigns")
      .select(
        `
        *,
        profiles:recipient_id (
          full_name,
          recipient_status
        )
      `
      )
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching campaigns:", error);
      throw error;
    }
    console.log("Fetched campaigns:", data);
    setCampaigns(data || []);
  };

  const fetchDonations = async () => {
    const { data, error } = await supabase
      .from("donations")
      .select(
        `
        *,
        profiles:donor_id (
          full_name
        )
      `
      )
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching donations:", error);
      throw error;
    }
    console.log("Fetched donations:", data);
    setDonations(data || []);
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching reports:", error);
      throw error;
    }
    setReports(data || []);
  };

  const handleVerificationApproval = async (
    userId: string,
    approved: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          recipient_status: approved ? "approved" : "unrequested",
        })
        .eq("id", userId);

      if (error) throw error;

      Alert.alert(
        "Success",
        `Verification ${approved ? "approved" : "rejected"} successfully`
      );
      fetchVerifications();
    } catch (error) {
      console.error("Error updating verification:", error);
      Alert.alert("Error", "Failed to update verification status");
    }
  };

  const handleCampaignApproval = async (
    campaignId: string,
    approved: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          status: approved ? "active" : "rejected",
        })
        .eq("id", campaignId);

      if (error) throw error;

      Alert.alert(
        "Success",
        `Campaign ${approved ? "approved" : "rejected"} successfully`
      );
      fetchCampaigns();
    } catch (error) {
      console.error("Error updating campaign:", error);
      Alert.alert("Error", "Failed to update campaign status");
    }
  };

  const handleDonationApproval = async (
    donationId: string,
    approved: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("donations")
        .update({
          status: approved ? "available" : "rejected",
        })
        .eq("id", donationId);

      if (error) throw error;

      Alert.alert(
        "Success",
        `Donation ${approved ? "approved" : "rejected"} successfully`
      );
      fetchDonations();
    } catch (error) {
      console.error("Error updating donation:", error);
      Alert.alert("Error", "Failed to update donation status");
    }
  };

  const handleRemove = async (type: string, id: string) => {
    try {
      let table = "";
      if (type === "user") table = "profiles";
      if (type === "campaign") table = "campaigns";
      if (type === "donation") table = "donations";
      if (!table) return;
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      Alert.alert(
        "Success",
        `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`
      );
      fetchReports();
      fetchCampaigns();
      fetchDonations();
      fetchVerifications();
    } catch (error) {
      console.error("Error deleting:", error);
      Alert.alert("Error", `Failed to delete ${type}`);
    }
  };

  const renderVerifications = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pending Verifications</Text>
      {verifications.length === 0 ? (
        <Text style={styles.emptyText}>No pending verifications</Text>
      ) : (
        verifications.map((user) => (
          <View key={user.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{user.full_name}</Text>
              <Text style={styles.cardSubtitle}>{user.email}</Text>
            </View>
            {user.verification_image_url && (
              <Image
                source={{ uri: user.verification_image_url }}
                style={styles.verificationImage}
              />
            )}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleVerificationApproval(user.id, true)}
              >
                <CheckCircle size={16} color="#ffffff" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleVerificationApproval(user.id, false)}
              >
                <XCircle size={16} color="#ffffff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  console.log("campaigns", campaigns);

  const renderCampaigns = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pending Campaigns</Text>
      {campaigns.length === 0 ? (
        <Text style={styles.emptyText}>No pending campaigns</Text>
      ) : (
        campaigns.map((campaign) => (
          <View key={campaign.id} style={styles.card}>
            {/* image */}
            <Image
              source={{ uri: campaign.image_url }}
              style={{ width: "100%", height: 200, borderRadius: 8 }}
            />
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{campaign.title}</Text>
              <Text style={styles.cardSubtitle}>
                By: {campaign.profiles?.full_name}
              </Text>
            </View>
            <Text style={styles.cardDescription}>{campaign.description}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>Category: {campaign.category}</Text>
              <Text style={styles.metaText}>Location: {campaign.location}</Text>
              {campaign.goal_amount && (
                <Text style={styles.metaText}>
                  Goal: ${campaign.goal_amount}
                </Text>
              )}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleCampaignApproval(campaign.id, true)}
              >
                <CheckCircle size={16} color="#ffffff" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleCampaignApproval(campaign.id, false)}
              >
                <XCircle size={16} color="#ffffff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderDonations = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pending Donations</Text>
      {donations.length === 0 ? (
        <Text style={styles.emptyText}>No pending donations</Text>
      ) : (
        donations.map((donation) => (
          <View key={donation.id} style={styles.card}>
            <Image
              source={{ uri: donation.image_url }}
              style={{ width: "100%", height: 200, borderRadius: 8 }}
            />
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{donation.title}</Text>
              <Text style={styles.cardSubtitle}>
                By: {donation.profiles?.full_name}
              </Text>
            </View>
            <Text style={styles.cardDescription}>{donation.description}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>Category: {donation.category}</Text>
              <Text style={styles.metaText}>Location: {donation.location}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleDonationApproval(donation.id, true)}
              >
                <CheckCircle size={16} color="#ffffff" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleDonationApproval(donation.id, false)}
              >
                <XCircle size={16} color="#ffffff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

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
                onPress={() =>
                  Alert.alert("View", `Reported ID: ${report.reported_id}`)
                }
              >
                <Eye size={16} color="#fff" />
                <Text style={styles.actionButtonText}>View</Text>
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
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await signOut();
            setTimeout(() => {
              router.replace("/(auth)/login");
            }, 100);
          }}
        >
          <LogOut size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "verifications" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("verifications")}
        >
          <Users
            size={20}
            color={activeTab === "verifications" ? "#2563EB" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "verifications" && styles.activeTabText,
            ]}
          >
            Verifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "campaigns" && styles.activeTab]}
          onPress={() => setActiveTab("campaigns")}
        >
          <Heart
            size={20}
            color={activeTab === "campaigns" ? "#2563EB" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "campaigns" && styles.activeTabText,
            ]}
          >
            Campaigns
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "donations" && styles.activeTab]}
          onPress={() => setActiveTab("donations")}
        >
          <Gift
            size={20}
            color={activeTab === "donations" ? "#2563EB" : "#6B7280"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "donations" && styles.activeTabText,
            ]}
          >
            Donations
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />
        ) : (
          <>
            {activeTab === "verifications" && renderVerifications()}
            {activeTab === "campaigns" && renderCampaigns()}
            {activeTab === "donations" && renderDonations()}
            {activeTab === "reports" && renderReports()}
          </>
        )}
      </ScrollView>
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#EFF6FF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#2563EB",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loader: {
    marginTop: 50,
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
  cardMeta: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  verificationImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#F3F4F6",
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
  logoutButton: {
    position: "absolute",
    top: 16,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
});
