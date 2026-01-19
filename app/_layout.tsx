import { AuthProvider } from "@/contexts/AuthContext";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar backgroundColor="#ffffff" style="dark" />
    </AuthProvider>
  );
}
