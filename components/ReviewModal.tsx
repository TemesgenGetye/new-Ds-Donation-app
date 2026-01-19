import { supabase } from "@/lib/supabase";
import { Star, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  donationId: string;
  donorId: string;
  recipientId: string;
  donorName: string;
}

interface Review {
  rating: number;
  comment: string | null;
  created_at: string;
}

export default function ReviewModal({
  visible,
  onClose,
  donationId,
  donorId,
  recipientId,
  donorName,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (visible && donorId) {
      supabase
        .from("ratings")
        .select("rating, comment, created_at")
        .eq("donor_id", donorId)
        .order("created_at", { ascending: false })
        .then(({ data }) => setReviews(data || []));
    }
  }, [visible, donorId]);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    setLoading(true);

    try {
      // First, check if a rating already exists for this donation and recipient
      const { data: existingRating } = await supabase
        .from("ratings")
        .select("id")
        .eq("donation_id", donationId)
        .eq("recipient_id", recipientId)
        .single();

      let error;

      if (existingRating) {
        // Update existing rating
        const { error: updateError } = await supabase
          .from("ratings")
          .update({
            rating,
            comment: comment.trim() || null,
          })
          .eq("id", existingRating.id);
        error = updateError;
      } else {
        // Insert new rating
        const { error: insertError } = await supabase.from("ratings").insert({
          donation_id: donationId,
          recipient_id: recipientId,
          donor_id: donorId,
          rating,
          comment: comment.trim() || null,
        });
        error = insertError;
      }

      if (error) throw error;

      Alert.alert("Success", "Review submitted successfully!");
      onClose();
      setRating(0);
      setComment("");
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <TouchableOpacity
        key={index}
        onPress={() => setRating(index + 1)}
        style={styles.starButton}
      >
        <Star
          size={32}
          color={index < rating ? "#F59E0B" : "#D1D5DB"}
          fill={index < rating ? "#F59E0B" : "transparent"}
        />
      </TouchableOpacity>
    ));
  };

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
            <Text style={styles.title}>Rate Your Experience</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            How was your experience with {donorName}?
          </Text>

          <View style={styles.starsContainer}>{renderStars()}</View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Comment (Optional)</Text>
            <TextInput
              style={styles.textArea}
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitReview}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Submitting..." : "Submit Review"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Reviews for {donorName}</Text>
          <FlatList
            data={reviews}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View style={styles.reviewItem}>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      color={star <= item.rating ? "#F59E0B" : "#D1D5DB"}
                      fill={star <= item.rating ? "#F59E0B" : "none"}
                    />
                  ))}
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
                {item.comment && (
                  <Text style={styles.reviewComment}>{item.comment}</Text>
                )}
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyReview}>No reviews yet.</Text>
            }
          />
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  reviewItem: {
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  reviewDate: {
    marginLeft: 8,
    color: "#6B7280",
  },
  reviewComment: {
    marginTop: 4,
  },
  emptyReview: {
    textAlign: "center",
  },
});
