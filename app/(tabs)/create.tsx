import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { decode as atob } from "base-64";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Camera,
  DollarSign,
  MapPin,
  Upload,
  User,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Campaign database client (separate from main database) - ONLY for image uploads
const campaignSupabaseUrl = process.env.EXPO_PUBLIC_CAMPAIGN_SUPABASE_URL || "https://xhkixkkslqvhkzsxddge.supabase.co";
const campaignSupabaseKey = process.env.EXPO_PUBLIC_CAMPAIGN_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoa2l4a2tzbHF2aGt6c3hkZGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDY0NzYsImV4cCI6MjA4NDY4MjQ3Nn0.pE8N8sOIY2Sn4xMz2FRKceU7N-N7slEFxDEJdLTLu8A";
const campaignSupabase = createClient(campaignSupabaseUrl, campaignSupabaseKey);

// Helper function to get campaign service URL based on platform
// IMPORTANT: Campaigns MUST be created via API to publish RabbitMQ events!
// NOTE: For Expo Go on physical devices, always use IP address, not localhost!
const getCampaignServiceUrl = (): string => {
  // Your machine's IP address (update this if your IP changes)
  // Find it with: ipconfig getifaddr en0 (Mac) or ipconfig (Windows)
  const MACHINE_IP = "192.168.1.3";
  const IP_URL = `http://${MACHINE_IP}:3002`;
  
  // Check if explicitly set via environment variable
  const envUrl = process.env.EXPO_PUBLIC_CAMPAIGN_SERVICE_URL;
  if (envUrl) {
    console.log(`🔧 Environment variable found: ${envUrl}`);
    // If env var is set to localhost, override it with IP for mobile
    if (envUrl.includes('localhost') && Platform.OS !== 'web') {
      console.log(`⚠️ Env var is localhost but on mobile, overriding to IP: ${IP_URL}`);
      return IP_URL;
    }
    return envUrl;
  }
  
  // Platform-specific defaults
  const platform = Platform.OS;
  console.log(`🔍 Platform detected: ${platform}`);
  console.log(`🔍 __DEV__: ${__DEV__}`);
  
  // For Expo Go and mobile platforms, ALWAYS use IP address
  // localhost doesn't work from Expo Go on physical devices
  if (platform === 'android' || platform === 'ios') {
    console.log(`📱 Mobile platform (${platform}) detected, using IP: ${IP_URL}`);
    return IP_URL;
  }
  
  // Safety fallback: If not web, assume mobile (Expo Go) and use IP
  // This handles cases where platform detection might fail
  if (platform !== 'web') {
    console.log(`⚠️ Non-web platform (${platform}) detected, defaulting to IP: ${IP_URL}`);
    return IP_URL;
  }
  
  // For web platform only, use localhost (runs on same machine)
  console.log(`🌐 Web platform detected, using: http://localhost:3002`);
  return "http://localhost:3002";
};

export default function CreateScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  // For donors - donation form
  const [donationTitle, setDonationTitle] = useState("");
  const [donationDescription, setDonationDescription] = useState("");
  const [donationCategory, setDonationCategory] = useState("");
  const [donationLocation, setDonationLocation] = useState("");
  const [donationImage, setDonationImage] = useState<string | null>(null);

  // For recipients - campaign form
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignCategory, setCampaignCategory] = useState("");
  const [campaignLocation, setCampaignLocation] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [campaignImage, setCampaignImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const categories = [
    "Food",
    "Clothing",
    "Electronics",
    "Books",
    "Furniture",
    "Medical",
    "Education",
    "Other",
  ];

  // Unified image picker for both forms
  const pickImage = async (forDonation = true) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Camera roll permission is required to select images."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      if (forDonation) {
        setDonationImage(result.assets[0].uri);
      } else {
        setCampaignImage(result.assets[0].uri);
      }
    }
  };

  // Helper to convert base64 to Uint8Array
  function base64ToUint8Array(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Upload image for donations (old database)
  const uploadImage = async (uri: string | null) => {
    if (!uri) return null;
    try {
      let fileExt = uri.split(".").pop();
      if (!fileExt || fileExt.length > 5) fileExt = "jpg";
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      let fileData;
      let uploadOptions: any = {
        contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
        upsert: false,
      };
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        fileData = await response.blob();
      } else {
        // Use legacy expo-file-system API (readAsStringAsync is deprecated but still works)
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileData = base64ToUint8Array(base64);
        if (uploadOptions.contentEncoding) delete uploadOptions.contentEncoding;
      }
      const uploadResult = await supabase.storage
        .from("donations")
        .upload(fileName, fileData, uploadOptions);
      if (uploadResult.error) {
        console.error("Upload error:", uploadResult.error);
        throw uploadResult.error;
      }
      const publicUrlResult = supabase.storage
        .from("donations")
        .getPublicUrl(fileName);
      if (!publicUrlResult.data || !publicUrlResult.data.publicUrl) {
        Alert.alert("Upload Error", "No image URL returned. Please try again.");
        return null;
      }
      return publicUrlResult.data.publicUrl;
    } catch {
      Alert.alert("Upload Error", "Failed to upload image. Please try again.");
      return null;
    }
  };

  // Upload image for campaigns (new database)
  const uploadCampaignImage = async (uri: string | null) => {
    if (!uri) return null;
    try {
      let fileExt = uri.split(".").pop();
      if (!fileExt || fileExt.length > 5) fileExt = "jpg";
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      let fileData;
      let uploadOptions: any = {
        contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
        upsert: false,
      };
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        fileData = await response.blob();
      } else {
        // Use legacy expo-file-system API (readAsStringAsync is deprecated but still works)
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileData = base64ToUint8Array(base64);
        if (uploadOptions.contentEncoding) delete uploadOptions.contentEncoding;
      }
      // Upload to campaign storage bucket in NEW database
      const uploadResult = await campaignSupabase.storage
        .from("campaigns")
        .upload(fileName, fileData, uploadOptions);
      if (uploadResult.error) {
        console.error("Campaign image upload error:", uploadResult.error);
        throw uploadResult.error;
      }
      const publicUrlResult = campaignSupabase.storage
        .from("campaigns")
        .getPublicUrl(fileName);
      if (!publicUrlResult.data || !publicUrlResult.data.publicUrl) {
        Alert.alert("Upload Error", "No image URL returned. Please try again.");
        return null;
      }
      return publicUrlResult.data.publicUrl;
    } catch (error: any) {
      console.error("Campaign image upload error:", error);
      Alert.alert("Upload Error", "Failed to upload campaign image. Please try again.");
      return null;
    }
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

  const createDonation = async () => {
    if (
      !donationTitle ||
      !donationDescription ||
      !donationCategory ||
      !donationLocation
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (!profile) {
      Alert.alert("Error", "User profile not found");
      return;
    }
    setLoading(true);
    try {
      let imageUrl = null;
      if (donationImage) {
        imageUrl = await uploadImage(donationImage);
        if (!imageUrl) {
          setLoading(false);
          return;
        }
      }
      
      // Call donation-service API instead of direct Supabase insert
      const donationServiceUrl = getDonationServiceUrl();
      const response = await fetch(`${donationServiceUrl}/api/donations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          donor_id: profile.id,
          title: donationTitle,
          description: donationDescription,
          category: donationCategory,
          location: donationLocation,
          image_url: imageUrl,
          status: "pending",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create donation" }));
        throw new Error(errorData.error || `Failed to create donation: ${response.status}`);
      }

      Alert.alert("Success", "Donation submitted for approval!", [
        { text: "OK", onPress: () => router.push("/(tabs)") },
      ]);
      setDonationTitle("");
      setDonationDescription("");
      setDonationCategory("");
      setDonationLocation("");
      setDonationImage(null);
    } catch (error: any) {
      console.error("Error creating donation:", error);
      Alert.alert("Error", error.message || "Failed to create donation");
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (
      !campaignTitle ||
      !campaignDescription ||
      !campaignCategory ||
      !campaignLocation
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (!profile) {
      Alert.alert("Error", "User profile not found");
      return;
    }
    setLoading(true);
    try {
      let imageUrl = null;
      if (campaignImage) {
        // Upload to campaign storage bucket in new database
        imageUrl = await uploadCampaignImage(campaignImage);
        if (!imageUrl) {
          setLoading(false);
          return;
        }
      }
      
      // IMPORTANT: Call campaign-service API (NOT direct Supabase insert)
      // This ensures RabbitMQ events are published!
      const campaignServiceUrl = getCampaignServiceUrl();
      const apiUrl = `${campaignServiceUrl}/api/campaigns`;
      console.log(`🌐 Calling campaign-service API at: ${apiUrl}`);
      console.log(`📱 Platform: ${Platform.OS}, URL: ${campaignServiceUrl}`);
      
      const requestBody = {
        recipient_id: profile.id,
        title: campaignTitle,
        description: campaignDescription,
        category: campaignCategory,
        location: campaignLocation,
        goal_amount: campaignGoal ? parseFloat(campaignGoal) : null,
        image_url: imageUrl,
        status: "pending",
      };
      console.log(`📦 Request body:`, JSON.stringify(requestBody).substring(0, 200));
      
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        console.log(`📡 Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to create campaign" }));
          console.error(`❌ API Error:`, errorData);
          throw new Error(errorData.error || `Failed to create campaign: ${response.status}`);
        }
        
        const campaign = await response.json();
        console.log(`✅ Campaign created via API:`, campaign.id);
      } catch (fetchError: any) {
        console.error(`❌ Network/Fetch Error:`, fetchError);
        console.error(`   - Message: ${fetchError.message}`);
        console.error(`   - URL attempted: ${apiUrl}`);
        console.error(`   - Make sure your phone and computer are on the same WiFi network`);
        throw fetchError;
      }
      Alert.alert("Success", "Campaign submitted for approval!", [
        { text: "OK", onPress: () => router.push({ pathname: "/campaigns" }) },
      ]);
      setCampaignTitle("");
      setCampaignDescription("");
      setCampaignCategory("");
      setCampaignLocation("");
      setCampaignGoal("");
      setCampaignImage(null);
    } catch (error: any) {
      console.error("Campaign creation error:", error);
      Alert.alert("Error", error.message || "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  // Show donation form for donors
  if (profile?.role === "donor") {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Donation</Text>
              <Text style={styles.subtitle}>Share what you want to donate</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={donationTitle}
                  onChangeText={setDonationTitle}
                  placeholder="What are you donating?"
                  placeholderTextColor="#6B7280"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={donationDescription}
                  onChangeText={setDonationDescription}
                  placeholder="Describe the item(s) in detail..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#6B7280"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categoryContainer}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryButton,
                          donationCategory === cat &&
                            styles.categoryButtonActive,
                        ]}
                        onPress={() => setDonationCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            donationCategory === cat &&
                              styles.categoryButtonTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Location *</Text>
                <View style={styles.locationInputContainer}>
                  <MapPin size={20} color="#6B7280" />
                  <TextInput
                    style={styles.locationInput}
                    value={donationLocation}
                    onChangeText={setDonationLocation}
                    placeholder="Enter pickup location"
                    placeholderTextColor="#6B7280"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Photo</Text>
                <TouchableOpacity
                  style={styles.imageUpload}
                  onPress={() => pickImage(true)}
                >
                  {donationImage ? (
                    <Image
                      source={{ uri: donationImage }}
                      style={styles.uploadedImage}
                    />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Camera size={32} color="#6B7280" />
                      <Text style={styles.uploadText}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  loading && styles.createButtonDisabled,
                ]}
                onPress={createDonation}
                disabled={loading}
              >
                <Upload size={20} color="#ffffff" />
                <Text style={styles.createButtonText}>
                  {loading ? "Creating..." : "Create Donation"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Show campaign form for recipients
  if (
    profile?.role === "recipient" &&
    profile.recipient_status !== "approved"
  ) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Campaign</Text>
          <Text style={styles.subtitle}>Tell your story and ask for help</Text>
        </View>
        <View style={styles.approvalRequiredContainerCentered}>
          <AlertCircle size={32} color="#EF4444" style={{ marginBottom: 12 }} />
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
            <Text style={styles.approvalButtonTextCentered}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Campaign</Text>
        <Text style={styles.subtitle}>Tell your story and ask for help</Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Campaign Title *</Text>
              <TextInput
                style={[styles.input, { color: "#1F2937" }]}
                value={campaignTitle}
                onChangeText={setCampaignTitle}
                placeholder="What do you need help with?"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { color: "#1F2937" }]}
                value={campaignDescription}
                onChangeText={setCampaignDescription}
                placeholder="Tell your story and explain why you need help..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#6B7280"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        campaignCategory === cat && styles.categoryButtonActive,
                      ]}
                      onPress={() => setCampaignCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          campaignCategory === cat &&
                            styles.categoryButtonTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Goal Amount (Optional)</Text>
              <View style={styles.locationInputContainer}>
                <DollarSign size={20} color="#6B7280" />
                <TextInput
                  style={[styles.locationInput, { color: "#1F2937" }]}
                  value={campaignGoal}
                  onChangeText={setCampaignGoal}
                  placeholder="Enter target amount"
                  keyboardType="numeric"
                  placeholderTextColor="#6B7280"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location *</Text>
              <View style={styles.locationInputContainer}>
                <MapPin size={20} color="#6B7280" />
                <TextInput
                  style={[styles.locationInput, { color: "#1F2937" }]}
                  value={campaignLocation}
                  onChangeText={setCampaignLocation}
                  placeholder="Enter your location"
                  placeholderTextColor="#6B7280"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Photo</Text>
              <TouchableOpacity
                style={styles.imageUpload}
                onPress={() => pickImage(false)}
              >
                {campaignImage ? (
                  <Image
                    source={{ uri: campaignImage }}
                    style={styles.uploadedImage}
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Camera size={32} color="#6B7280" />
                    <Text style={styles.uploadText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.createButton,
                loading && styles.createButtonDisabled,
              ]}
              onPress={createCampaign}
              disabled={loading}
            >
              <Upload size={20} color="#ffffff" />
              <Text style={styles.createButtonText}>
                {loading ? "Creating..." : "Create Campaign"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  form: {
    padding: 20,
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
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#ffffff",
    color: "#1F2937",
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  categoryContainer: {
    flexDirection: "row",
    paddingHorizontal: 0,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#ffffff",
  },
  categoryButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  categoryButtonTextActive: {
    color: "#ffffff",
  },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  locationInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1F2937",
  },
  imageUpload: {
    height: 200,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  uploadPlaceholder: {
    alignItems: "center",
  },
  uploadText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  createButton: {
    backgroundColor: "#2563EB",
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
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
