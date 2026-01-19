import { useAuth } from "@/contexts/AuthContext";
import { Tabs, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Flag,
  HeartIcon,
  Home,
  MessageSquare,
  Package,
  Shield,
  User,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, View } from "react-native";

export default function TabLayout() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const isDonor = profile?.role === "donor";
  const isAdmin = profile?.role === "admin";
  const [blockedHandled, setBlockedHandled] = useState(false);
  const alertShown = useRef(false);

  useEffect(() => {
    if (profile?.blocked && !blockedHandled && !alertShown.current) {
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
    }
  }, [profile, signOut, router, blockedHandled]);

  if (profile?.blocked) {
    // Show nothing while blocked (or you can show a spinner)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F9FAFB",
        }}
      >
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // If user is admin, show ONLY the admin tab
  if (isAdmin) {
    return (
      <>
        <StatusBar backgroundColor="#ffffff" style="dark" />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#2563EB",
            tabBarInactiveTintColor: "#6B7280",
            tabBarStyle: {
              backgroundColor: "#ffffff",
              borderTopWidth: 1,
              borderTopColor: "#E5E7EB",
              paddingTop: 8,
              paddingBottom: 8,
              height: 80,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: "500",
              marginTop: 4,
            },
          }}
        >
          <Tabs.Screen
            name="admin"
            options={{
              title: "Admin Dashboard",
              tabBarIcon: ({ size, color }) => (
                <Shield size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="reports"
            options={{
              title: "Reports",
              tabBarIcon: ({ size, color }) => (
                <Flag size={size} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="users"
            options={{
              title: "Users",
              tabBarIcon: ({ size, color }) => (
                <User size={size} color={color} />
              ),
            }}
          />
          {/* Hide all other screens for admin */}
          <Tabs.Screen
            name="index"
            options={{
              href: null, // This hides the tab
            }}
          />
          <Tabs.Screen
            name="requests"
            options={{
              href: null, // This hides the tab
            }}
          />
          <Tabs.Screen
            name="create"
            options={{
              href: null, // This hides the tab
            }}
          />

          <Tabs.Screen
            name="profile"
            options={{
              href: null, // This hides the tab
            }}
          />
          <Tabs.Screen
            name="campaigns"
            options={{
              href: null, // This hides the tab
            }}
          />
        </Tabs>
      </>
    );
  }

  // Regular users (donors and recipients) see normal tabs - NO ADMIN TAB
  return (
    <>
      <StatusBar backgroundColor="#ffffff" style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#6B7280",
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            paddingTop: 8,
            paddingBottom: 8,
            height: 80,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: isDonor ? "Donations" : "Browse",
            tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="requests"
          options={{
            title: "Requests",
            tabBarIcon: ({ size, color }) => (
              <MessageSquare size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: isDonor ? "Add Item" : "Create",
            tabBarIcon: ({ size, color }) => (
              <Package size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="campaigns"
          options={{
            title: "Campaigns",
            tabBarIcon: ({ size, color }) => (
              <HeartIcon size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
          }}
        />

        {/* Hide admin tab for non-admin users */}
        <Tabs.Screen
          name="admin"
          options={{
            href: null, // This completely hides the tab
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            href: null, // Hide reports tab for non-admins
          }}
        />

        <Tabs.Screen
          name="users"
          options={{
            href: null, // This hides the tab
          }}
        />
      </Tabs>
    </>
  );
}
