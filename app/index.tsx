import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  View,
} from "react-native";

export default function IndexScreen() {
  const { session, loading, profile, signOut } = useAuth();
  const router = useRouter();
  const [blockedHandled, setBlockedHandled] = useState(false);
  const alertShown = useRef(false);

  useEffect(() => {
    if (
      !loading &&
      profile?.blocked &&
      !blockedHandled &&
      !alertShown.current
    ) {
      alertShown.current = true;
      setBlockedHandled(true);
      Alert.alert(
        "🚫 Account Blocked",
        "Your account has been blocked. Please contact support for more information.",
        [
          {
            text: "📞 Call Support (8181)",
            onPress: async () => {
              // Open phone dialer with the number
              const phoneNumber = "8181";
              const url = `tel:${phoneNumber}`;
              try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                } else {
                  console.log("Phone dialer not supported");
                }
              } catch (error) {
                console.error("Error opening phone dialer:", error);
              }
            },
          },
          {
            text: "OK",
            onPress: async () => {
              await signOut();
              router.replace("/(auth)/login");
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }
    if (!loading && profile?.blocked) {
      // Blocked, do nothing else
      return;
    }
    if (!loading && session && profile && !profile?.blocked) {
      router.replace("/(tabs)");
    } else if (!loading && session && !profile) {
      // Stay on loading screen while profile is being fetched
    } else if (!loading && !session) {
      router.replace("/(auth)/login");
    }
  }, [session, loading, profile, router, signOut, blockedHandled]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
});
