// import { useAuth } from "@/contexts/AuthContext";
// import { supabase } from "@/lib/supabase";
// import { decode as atob } from "base-64";
// import * as FileSystem from "expo-file-system";
// import * as ImagePicker from "expo-image-picker";
// import { useRouter } from "expo-router";
// import { Camera, MapPin, Search, Upload } from "lucide-react-native";
// import { useState } from "react";
// import {
//   Alert,
//   Image,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";

// export default function CreateScreen() {
//   const { profile } = useAuth();
//   const router = useRouter();
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [category, setCategory] = useState("");
//   const [location, setLocation] = useState("");
//   const [image, setImage] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   // Search states for recipients
//   const [searchQuery, setSearchQuery] = useState("");
//   const [searchResults, setSearchResults] = useState<any[]>([]);
//   const [searching, setSearching] = useState(false);

//   const categories = [
//     "Food",
//     "Clothing",
//     "Electronics",
//     "Books",
//     "Furniture",
//     "Other",
//   ];

//   const pickImage = async () => {
//     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

//     if (status !== "granted") {
//       Alert.alert(
//         "Permission needed",
//         "Camera roll permission is required to select images."
//       );
//       return;
//     }

//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images, // fallback for current expo-image-picker version
//       allowsEditing: true,
//       aspect: [4, 3],
//       quality: 0.8,
//     });

//     if (!result.canceled) {
//       setImage(result.assets[0].uri);
//     }
//   };

//   // Helper to convert base64 to Uint8Array
//   function base64ToUint8Array(base64: string) {
//     const binaryString = atob(base64);
//     const len = binaryString.length;
//     const bytes = new Uint8Array(len);
//     for (let i = 0; i < len; i++) {
//       bytes[i] = binaryString.charCodeAt(i);
//     }
//     return bytes;
//   }

//   const uploadImage = async () => {
//     if (!image) return null;

//     try {
//       // Create a unique filename with fallback extension
//       let fileExt = image.split(".").pop();
//       if (!fileExt || fileExt.length > 5) fileExt = "jpg";
//       const fileName = `${Date.now()}-${Math.random()
//         .toString(36)
//         .substring(2)}.${fileExt}`;

//       let fileData;
//       let uploadOptions: any = {
//         contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
//         upsert: false,
//       };

//       if (Platform.OS === "web") {
//         const response = await fetch(image);
//         fileData = await response.blob();
//       } else {
//         // On native, upload binary (Uint8Array) instead of base64 string
//         const base64 = await FileSystem.readAsStringAsync(image, {
//           encoding: FileSystem.EncodingType.Base64,
//         });
//         fileData = base64ToUint8Array(base64);
//         // Do NOT set contentEncoding for binary upload
//         if (uploadOptions.contentEncoding) delete uploadOptions.contentEncoding;
//       }

//       console.log("Uploading image:", fileName, "File:", image);

//       const { data, error } = await supabase.storage
//         .from("donations")
//         .upload(fileName, fileData, uploadOptions);

//       if (error) {
//         console.error("Upload error:", error);
//         throw error;
//       }

//       console.log("Upload successful:", data);

//       // Get the public URL
//       const publicUrlResult = supabase.storage
//         .from("donations")
//         .getPublicUrl(fileName);

//       if (!publicUrlResult.data || !publicUrlResult.data.publicUrl) {
//         console.error(
//           "No public URL returned for uploaded image",
//           publicUrlResult
//         );
//         Alert.alert("Upload Error", "No image URL returned. Please try again.");
//         return null;
//       }

//       console.log("Public URL:", publicUrlResult.data.publicUrl);
//       return publicUrlResult.data.publicUrl;
//     } catch (error) {
//       console.error("Error uploading image:", error);
//       Alert.alert("Upload Error", "Failed to upload image. Please try again.");
//       return null;
//     }
//   };

//   const createDonation = async () => {
//     if (!title || !description || !category || !location) {
//       Alert.alert("Error", "Please fill in all required fields");
//       return;
//     }

//     if (!profile) {
//       Alert.alert("Error", "User profile not found");
//       return;
//     }

//     setLoading(true);

//     try {
//       let imageUrl = null;

//       if (image) {
//         console.log("Starting image upload...");
//         imageUrl = await uploadImage();
//         if (image && !imageUrl) {
//           // Image upload failed
//           setLoading(false);
//           return;
//         }
//       }

//       console.log("Creating donation with image URL:", imageUrl);

//       const { error } = await supabase.from("donations").insert({
//         donor_id: profile.id,
//         title,
//         description,
//         category,
//         location,
//         image_url: imageUrl,
//         status: "available",
//       });

//       if (error) throw error;

//       Alert.alert("Success", "Donation created successfully!", [
//         { text: "OK", onPress: () => router.push("/(tabs)") },
//       ]);

//       // Reset form
//       setTitle("");
//       setDescription("");
//       setCategory("");
//       setLocation("");
//       setImage(null);
//     } catch (error) {
//       console.error("Error creating donation:", error);
//       Alert.alert("Error", "Failed to create donation");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const searchDonations = async () => {
//     if (!searchQuery.trim()) {
//       setSearchResults([]);
//       return;
//     }

//     setSearching(true);
//     try {
//       const { data, error } = await supabase
//         .from("donations")
//         .select(
//           `
//           *,
//           profiles:donor_id (
//             full_name,
//             avatar_url
//           )
//         `
//         )
//         .eq("status", "available")
//         .or(
//           `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`
//         )
//         .order("created_at", { ascending: false })
//         .limit(10);

//       if (error) throw error;
//       setSearchResults(data || []);
//     } catch (error) {
//       console.error("Error searching donations:", error);
//       Alert.alert("Error", "Failed to search donations");
//     } finally {
//       setSearching(false);
//     }
//   };

//   const handleDonationPress = (donation: any) => {
//     router.push({
//       pathname: "/donation-details",
//       params: { donationId: donation.id },
//     });
//   };

//   // Show loading state while profile is being fetched
//   if (!profile) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <View style={styles.loadingContainer}>
//           <Text style={styles.loadingText}>Loading...</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   // For recipients, show search interface
//   if (profile.role === "recipient") {
//     return (
//       <SafeAreaView style={styles.container}>
//         <View style={styles.header}>
//           <Text style={styles.title}>Search Donations</Text>
//           <Text style={styles.subtitle}>Find items you need</Text>
//         </View>

//         <View style={styles.searchSection}>
//           <View style={styles.searchContainer}>
//             <Search size={20} color="#6B7280" />
//             <TextInput
//               style={styles.searchInput}
//               value={searchQuery}
//               onChangeText={setSearchQuery}
//               placeholder="Search for donations..."
//               onSubmitEditing={searchDonations}
//             />
//             <TouchableOpacity
//               style={styles.searchButton}
//               onPress={searchDonations}
//               disabled={searching}
//             >
//               <Text style={styles.searchButtonText}>
//                 {searching ? "Searching..." : "Search"}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           <ScrollView style={styles.resultsContainer}>
//             {searchResults.map((donation) => (
//               <TouchableOpacity
//                 key={donation.id}
//                 style={styles.resultCard}
//                 onPress={() => handleDonationPress(donation)}
//               >
//                 {donation.image_url && (
//                   <Image
//                     source={{ uri: donation.image_url }}
//                     style={styles.resultImage}
//                   />
//                 )}
//                 <View style={styles.resultContent}>
//                   <Text style={styles.resultTitle}>{donation.title}</Text>
//                   <Text style={styles.resultDescription} numberOfLines={2}>
//                     {donation.description}
//                   </Text>
//                   <View style={styles.resultFooter}>
//                     <Text style={styles.resultCategory}>
//                       {donation.category}
//                     </Text>
//                     <Text style={styles.resultLocation}>
//                       {donation.location}
//                     </Text>
//                   </View>
//                   <Text style={styles.resultDonor}>
//                     by {donation.profiles?.full_name}
//                   </Text>
//                 </View>
//               </TouchableOpacity>
//             ))}

//             {searchQuery && searchResults.length === 0 && !searching && (
//               <View style={styles.noResultsContainer}>
//                 <Text style={styles.noResultsText}>
//                   No donations found matching your search.
//                 </Text>
//               </View>
//             )}
//           </ScrollView>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   // For donors, show donation creation form
//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={styles.keyboardView}
//       >
//         <ScrollView contentContainerStyle={styles.scrollContent}>
//           <View style={styles.header}>
//             <Text style={styles.title}>Create Donation</Text>
//             <Text style={styles.subtitle}>Share what you want to donate</Text>
//           </View>

//           <View style={styles.form}>
//             <View style={styles.inputContainer}>
//               <Text style={styles.label}>Title *</Text>
//               <TextInput
//                 style={styles.input}
//                 value={title}
//                 onChangeText={setTitle}
//                 placeholder="What are you donating?"
//               />
//             </View>

//             <View style={styles.inputContainer}>
//               <Text style={styles.label}>Description *</Text>
//               <TextInput
//                 style={[styles.input, styles.textArea]}
//                 value={description}
//                 onChangeText={setDescription}
//                 placeholder="Describe the item(s) in detail..."
//                 multiline
//                 numberOfLines={4}
//                 textAlignVertical="top"
//               />
//             </View>

//             <View style={styles.inputContainer}>
//               <Text style={styles.label}>Category *</Text>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 <View style={styles.categoryContainer}>
//                   {categories.map((cat) => (
//                     <TouchableOpacity
//                       key={cat}
//                       style={[
//                         styles.categoryButton,
//                         category === cat && styles.categoryButtonActive,
//                       ]}
//                       onPress={() => setCategory(cat)}
//                     >
//                       <Text
//                         style={[
//                           styles.categoryButtonText,
//                           category === cat && styles.categoryButtonTextActive,
//                         ]}
//                       >
//                         {cat}
//                       </Text>
//                     </TouchableOpacity>
//                   ))}
//                 </View>
//               </ScrollView>
//             </View>

//             <View style={styles.inputContainer}>
//               <Text style={styles.label}>Location *</Text>
//               <View style={styles.locationInputContainer}>
//                 <MapPin size={20} color="#6B7280" />
//                 <TextInput
//                   style={styles.locationInput}
//                   value={location}
//                   onChangeText={setLocation}
//                   placeholder="Enter pickup location"
//                 />
//               </View>
//             </View>

//             <View style={styles.inputContainer}>
//               <Text style={styles.label}>Photo</Text>
//               <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
//                 {image ? (
//                   <Image source={{ uri: image }} style={styles.uploadedImage} />
//                 ) : (
//                   <View style={styles.uploadPlaceholder}>
//                     <Camera size={32} color="#6B7280" />
//                     <Text style={styles.uploadText}>Add Photo</Text>
//                   </View>
//                 )}
//               </TouchableOpacity>
//             </View>

//             <TouchableOpacity
//               style={[
//                 styles.createButton,
//                 loading && styles.createButtonDisabled,
//               ]}
//               onPress={createDonation}
//               disabled={loading}
//             >
//               <Upload size={20} color="#ffffff" />
//               <Text style={styles.createButtonText}>
//                 {loading ? "Creating..." : "Create Donation"}
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F9FAFB",
//   },
//   keyboardView: {
//     flex: 1,
//   },
//   scrollContent: {
//     flexGrow: 1,
//   },
//   header: {
//     backgroundColor: "#ffffff",
//     paddingHorizontal: 20,
//     paddingTop: 20,
//     paddingBottom: 24,
//     borderBottomWidth: 1,
//     borderBottomColor: "#E5E7EB",
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: "700",
//     color: "#1F2937",
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: "#6B7280",
//   },
//   form: {
//     padding: 20,
//   },
//   inputContainer: {
//     marginBottom: 24,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#374151",
//     marginBottom: 8,
//   },
//   input: {
//     height: 52,
//     borderWidth: 1,
//     borderColor: "#D1D5DB",
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     fontSize: 16,
//     backgroundColor: "#ffffff",
//   },
//   textArea: {
//     height: 120,
//     paddingTop: 16,
//   },
//   categoryContainer: {
//     flexDirection: "row",
//     paddingHorizontal: 0,
//   },
//   categoryButton: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     marginRight: 8,
//     borderWidth: 1,
//     borderColor: "#D1D5DB",
//     backgroundColor: "#ffffff",
//   },
//   categoryButtonActive: {
//     backgroundColor: "#2563EB",
//     borderColor: "#2563EB",
//   },
//   categoryButtonText: {
//     fontSize: 14,
//     fontWeight: "500",
//     color: "#6B7280",
//   },
//   categoryButtonTextActive: {
//     color: "#ffffff",
//   },
//   locationInputContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     height: 52,
//     borderWidth: 1,
//     borderColor: "#D1D5DB",
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     backgroundColor: "#ffffff",
//   },
//   locationInput: {
//     flex: 1,
//     marginLeft: 8,
//     fontSize: 16,
//     color: "#1F2937",
//   },
//   imageUpload: {
//     height: 200,
//     borderWidth: 2,
//     borderColor: "#D1D5DB",
//     borderStyle: "dashed",
//     borderRadius: 12,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#ffffff",
//   },
//   uploadPlaceholder: {
//     alignItems: "center",
//   },
//   uploadText: {
//     fontSize: 16,
//     color: "#6B7280",
//     marginTop: 8,
//   },
//   uploadedImage: {
//     width: "100%",
//     height: "100%",
//     borderRadius: 10,
//   },
//   createButton: {
//     backgroundColor: "#2563EB",
//     height: 52,
//     borderRadius: 12,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 8,
//     marginTop: 8,
//   },
//   createButtonDisabled: {
//     opacity: 0.6,
//   },
//   createButtonText: {
//     color: "#ffffff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   loadingContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingHorizontal: 40,
//   },
//   loadingText: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#1F2937",
//     textAlign: "center",
//   },
//   // Search-specific styles
//   searchSection: {
//     flex: 1,
//     padding: 20,
//   },
//   searchContainer: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#ffffff",
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     height: 52,
//     marginBottom: 20,
//     shadowColor: "#000",
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   searchInput: {
//     flex: 1,
//     marginLeft: 12,
//     fontSize: 16,
//     color: "#1F2937",
//   },
//   searchButton: {
//     backgroundColor: "#2563EB",
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 8,
//     marginLeft: 8,
//   },
//   searchButtonText: {
//     color: "#ffffff",
//     fontSize: 14,
//     fontWeight: "500",
//   },
//   resultsContainer: {
//     flex: 1,
//   },
//   resultCard: {
//     backgroundColor: "#ffffff",
//     borderRadius: 12,
//     marginBottom: 16,
//     shadowColor: "#000",
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//     overflow: "hidden",
//   },
//   resultImage: {
//     width: "100%",
//     height: 200,
//   },
//   resultContent: {
//     padding: 16,
//   },
//   resultTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#1F2937",
//     marginBottom: 8,
//   },
//   resultDescription: {
//     fontSize: 14,
//     color: "#6B7280",
//     lineHeight: 20,
//     marginBottom: 12,
//   },
//   resultFooter: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 8,
//   },
//   resultCategory: {
//     fontSize: 12,
//     color: "#2563EB",
//     backgroundColor: "#EFF6FF",
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 8,
//     fontWeight: "500",
//   },
//   resultLocation: {
//     fontSize: 12,
//     color: "#6B7280",
//   },
//   resultDonor: {
//     fontSize: 12,
//     color: "#2563EB",
//     fontWeight: "500",
//   },
//   noResultsContainer: {
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 60,
//   },
//   noResultsText: {
//     fontSize: 16,
//     color: "#6B7280",
//     textAlign: "center",
//   },
// });
