import ReportModal from "@/components/ReportModal";
import ReviewModal from "@/components/ReviewModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Clock,
  Flag,
  MapPin,
  MessageCircle,
  Star,
  User,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput as RNTextInput,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DonationDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [ratings, setRatings] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewModal, setReviewModal] = useState(false);
  const [reportModal, setReportModal] = useState({
    visible: false,
    reportedId: "",
    reportedName: "",
    type: "donation",
  });
  const [requestModal, setRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    fetchRatings();
    fetchRating();
  }, [params.id]);

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select(
          `
          *,
          profiles:recipient_id (
            full_name
          )
        `
        )
        .eq("donation_id", params.id);

      if (error) throw error;

      setRatings(data || []);
      if (data && data.length > 0) {
        const avg =
          data.reduce((sum, rating) => sum + rating.rating, 0) / data.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  };

  const fetchRating = async () => {
    if (profile?.id && params.id) {
      const { data } = await supabase
        .from("ratings")
        .select("id")
        .eq("donation_id", params.id)
        .eq("recipient_id", profile.id)
        .single();
      setHasRated(!!data);
    }
  };

  const handleRequestDonation = () => {
    if (!profile) return;
    setRequestModal(true);
  };

  const submitRequest = async () => {
    if (!profile || !requestMessage.trim()) return;
    setRequestLoading(true);
    try {
      const { error } = await supabase.from("requests").insert({
        donation_id: params.id as string,
        recipient_id: profile.id,
        message: requestMessage.trim(),
      });
      if (error) throw error;
      setRequestModal(false);
      setRequestMessage("");
      Alert.alert("Success", "Request sent successfully!");
    } catch (error) {
      console.error("Error sending request:", error);
      Alert.alert("Error", "Failed to send request");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleReportDonation = () => {
    setReportModal({
      visible: true,
      reportedId: params.id as string,
      reportedName: params.title as string,
      type: "donation",
    });
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        size={16}
        color={index < rating ? "#F59E0B" : "#D1D5DB"}
        fill={index < rating ? "#F59E0B" : "transparent"}
      />
    ));
  };

  const submitRating = async () => {
    if (!rating) {
      Alert.alert("Please select a star rating.");
      return;
    }
    const { error } = await supabase.from("ratings").insert({
      donation_id: params.id,
      donor_id: params.donorId,
      recipient_id: profile.id,
      rating,
      comment: comment.trim() || null,
    });
    if (error) {
      Alert.alert("Error", "Failed to submit rating.");
    } else {
      Alert.alert("Thank you!", "Your rating has been submitted.");
      setHasRated(true);
      setShowRatingForm(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" style="dark" translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donation Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {params.imageUrl && (
          <Image
            source={{ uri: params.imageUrl as string }}
            style={styles.image}
          />
        )}

        <View style={styles.details}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{params.title}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(params.status as string) },
              ]}
            >
              <Text style={styles.statusText}>{params.status}</Text>
            </View>
          </View>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.metaText}>{params.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.metaText}>
                {new Date(params.createdAt as string).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>Category:</Text>
            <Text style={styles.categoryValue}>{params.category}</Text>
          </View>

          <Text style={styles.description}>{params.description}</Text>

          <View style={styles.donorSection}>
            <View style={styles.donorInfo}>
              <User size={20} color="#2563EB" />
              <Text style={styles.donorName}>{params.donorName}</Text>
              {averageRating > 0 && (
                <View style={styles.ratingContainer}>
                  <Star size={16} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>
                    {averageRating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.reportButton}
                onPress={handleReportDonation}
              >
                <Flag size={16} color="#EF4444" />
                <Text style={styles.reportButtonText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>

          {profile?.role === "recipient" && params.status === "available" && (
            <>
              <TouchableOpacity
                style={styles.requestButton}
                onPress={handleRequestDonation}
              >
                <MessageCircle size={20} color="#ffffff" />
                <Text style={styles.requestButtonText}>Request This Item</Text>
              </TouchableOpacity>
              <Modal
                visible={requestModal}
                animationType="slide"
                transparent
                onRequestClose={() => setRequestModal(false)}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(0,0,0,0.4)",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#fff",
                      padding: 24,
                      borderRadius: 16,
                      width: "85%",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        marginBottom: 12,
                      }}
                    >
                      Request Donation
                    </Text>
                    <Text
                      style={{
                        color: "#374151",
                        marginBottom: 12,
                      }}
                    >
                      Send a message to the donor explaining why you need this
                      item:
                    </Text>
                    <RNTextInput
                      style={{
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                        borderRadius: 8,
                        padding: 12,
                        minHeight: 80,
                        marginBottom: 16,
                        textAlignVertical: "top",
                      }}
                      multiline
                      numberOfLines={4}
                      value={requestMessage}
                      onChangeText={setRequestMessage}
                      placeholder="Type your message..."
                      editable={!requestLoading}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        gap: 12,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => setRequestModal(false)}
                        disabled={requestLoading}
                        style={{ paddingVertical: 8, paddingHorizontal: 16 }}
                      >
                        <Text
                          style={{
                            color: "#6B7280",
                            fontWeight: "500",
                          }}
                        >
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={submitRequest}
                        disabled={requestLoading || !requestMessage.trim()}
                        style={{
                          backgroundColor: "#2563EB",
                          borderRadius: 8,
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          opacity:
                            requestLoading || !requestMessage.trim() ? 0.6 : 1,
                        }}
                      >
                        {requestLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text
                            style={{
                              color: "#fff",
                              fontWeight: "600",
                            }}
                          >
                            Send Request
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </>
          )}

          {profile?.role === "recipient" && params.status === "completed" && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => setReviewModal(true)}
            >
              <Star size={20} color="#ffffff" />
              <Text style={styles.reviewButtonText}>Write a Review</Text>
            </TouchableOpacity>
          )}

          {ratings.length > 0 && (
            <View style={styles.reviewsSection}>
              <Text style={styles.reviewsTitle}>
                Reviews ({ratings.length})
              </Text>
              {ratings.map((rating) => (
                <View key={rating.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>
                      {rating.profiles?.full_name}
                    </Text>
                    <View style={styles.reviewStars}>
                      {renderStars(rating.rating)}
                    </View>
                  </View>
                  {rating.comment && (
                    <Text style={styles.reviewComment}>{rating.comment}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(rating.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {profile?.id === params.recipientId && !hasRated && (
            <View
              style={{
                marginVertical: 16,
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 16,
              }}
            >
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
              <RNTextInput
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
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Submit Rating
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <ReviewModal
        visible={reviewModal}
        onClose={() => setReviewModal(false)}
        donationId={params.id as string}
        donorId={params.donorId as string}
        recipientId={profile?.id || ""}
        donorName={params.donorName as string}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: 250,
  },
  details: {
    padding: 20,
    backgroundColor: "#ffffff",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    textTransform: "capitalize",
  },
  metaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginRight: 8,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  description: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 24,
  },
  donorSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 24,
  },
  donorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  donorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
    marginLeft: 8,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#F59E0B",
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
    paddingVertical: 8,
    borderRadius: 12,
  },
  reportButtonText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "500",
    marginLeft: 4,
  },
  requestButton: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  requestButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  reviewButton: {
    backgroundColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  reviewButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  reviewsSection: {
    marginTop: 24,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  reviewStars: {
    flexDirection: "row",
  },
  reviewComment: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: "#6B7280",
  },
});
