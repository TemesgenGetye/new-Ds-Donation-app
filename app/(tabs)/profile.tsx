import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  Camera,
  CheckCircle,
  Clock,
  Edit3,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  Settings,
  User,
  X,
  XCircle,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { profile, signOut, updateProfile, loading } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    location: profile?.location || "",
  });

  // Update editedProfile when profile changes (for real-time updates)
  React.useEffect(() => {
    if (profile && !editing) {
      setEditedProfile({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        location: profile.location || "",
      });
    }
  }, [profile, editing]);

  const handleSave = async () => {
    const { error } = await updateProfile(editedProfile);

    if (error) {
      Alert.alert("Error", "Failed to update profile");
    } else {
      Alert.alert("Success", "Profile updated successfully");
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
    });
    setEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!profile) return;

    setUploading(true);
    try {
      const fileName = `verification_${profile.id}_${Date.now()}.jpg`;

      // Create a file object from the URI
      const file = {
        uri: uri,
        type: "image/jpeg",
        name: fileName,
      };

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("verification")
        .upload(fileName, file as any);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("verification")
        .getPublicUrl(fileName);

      // Update profile with verification image URL and set status to requested
      // Use the updateProfile function from auth context instead of direct supabase call
      const { error: updateError } = await updateProfile({
        verification_image_url: urlData.publicUrl,
        recipient_status: "requested",
      });

      if (updateError) throw updateError;

      Alert.alert(
        "Success",
        "Verification image uploaded successfully. Please wait for admin approval."
      );

      // Refresh the page to show updated profile data
      // Note: In a real app, you might want to implement a proper state refresh
      // For now, we'll just show the success message
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload verification image");
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "requested":
        return "#F59E0B";
      case "unrequested":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle size={20} color="#10B981" />;
      case "requested":
        return <Clock size={20} color="#F59E0B" />;
      case "unrequested":
        return <XCircle size={20} color="#6B7280" />;
      default:
        return <XCircle size={20} color="#6B7280" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved";
      case "requested":
        return "Pending Approval";
      case "unrequested":
        return "Not Requested";
      default:
        return "Not Requested";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => (editing ? handleCancel() : setEditing(true))}
        >
          {editing ? (
            <X size={24} color="#6B7280" />
          ) : (
            <Edit3 size={24} color="#6B7280" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <User size={48} color="#2563EB" />
          </View>

          <View style={styles.roleContainer}>
            <Text style={styles.roleText}>{profile?.role?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <User size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedProfile.full_name}
                  onChangeText={(text) =>
                    setEditedProfile((prev) => ({ ...prev, full_name: text }))
                  }
                  placeholder="Enter your full name"
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.full_name}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Mail size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Phone size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              {editing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedProfile.phone}
                  onChangeText={(text) =>
                    setEditedProfile((prev) => ({ ...prev, phone: text }))
                  }
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {profile?.phone || "Not provided"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <MapPin size={20} color="#6B7280" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              {editing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedProfile.location}
                  onChangeText={(text) =>
                    setEditedProfile((prev) => ({ ...prev, location: text }))
                  }
                  placeholder="Enter your location"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {profile?.location || "Not provided"}
                </Text>
              )}
            </View>
          </View>
        </View>

        {editing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Save size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        )}

        {/* Verification Section - Only for recipients */}
        {profile?.role === "recipient" && (
          <View style={styles.verificationSection}>
            <Text style={styles.sectionTitle}>Recipient Verification</Text>

            <View style={styles.statusContainer}>
              <View style={styles.statusItem}>
                {getStatusIcon(profile?.recipient_status || "unrequested")}
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: getStatusColor(
                        profile?.recipient_status || "unrequested"
                      ),
                    },
                  ]}
                >
                  {getStatusText(profile?.recipient_status || "unrequested")}
                </Text>
              </View>
            </View>

            {profile?.verification_image_url && (
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Verification Image:</Text>
                <Image
                  source={{ uri: profile.verification_image_url }}
                  style={styles.verificationImage}
                />
              </View>
            )}

            {profile?.recipient_status === "unrequested" && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Camera size={20} color="#ffffff" />
                    <Text style={styles.uploadButtonText}>
                      Upload Verification Image
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {profile?.recipient_status === "requested" && (
              <View style={styles.pendingContainer}>
                <Text style={styles.pendingText}>
                  Your verification request is being reviewed by our admin team.
                  You&apos;ll be notified once approved.
                </Text>
              </View>
            )}

            {profile?.recipient_status === "approved" && (
              <View style={styles.approvedContainer}>
                <Text style={styles.approvedText}>
                  ✅ Your account has been verified! You can now create
                  campaigns and receive donations.
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionItem}>
            <Settings size={20} color="#6B7280" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, styles.signOutAction]}
            onPress={handleSignOut}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={[styles.actionText, styles.signOutText]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  editButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  roleContainer: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 1,
  },
  infoSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoIcon: {
    width: 40,
    alignItems: "center",
    paddingTop: 4,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#1F2937",
  },
  infoInput: {
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  saveButton: {
    backgroundColor: "#10B981",
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  verificationSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  imageContainer: {
    marginBottom: 16,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },
  verificationImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  uploadButton: {
    backgroundColor: "#2563EB",
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  pendingContainer: {
    backgroundColor: "#FEF3C7",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  pendingText: {
    color: "#92400E",
    fontSize: 14,
    lineHeight: 20,
  },
  approvedContainer: {
    backgroundColor: "#D1FAE5",
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  approvedText: {
    color: "#065F46",
    fontSize: 14,
    lineHeight: 20,
  },
  actionsSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  signOutAction: {
    borderBottomWidth: 0,
  },
  actionText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 16,
  },
  signOutText: {
    color: "#EF4444",
  },
});
