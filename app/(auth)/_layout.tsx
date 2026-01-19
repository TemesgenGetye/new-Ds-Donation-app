import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";

export default function AuthLayout() {
  return (
    <>
      <StatusBar backgroundColor="#ffffff" style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </>
  );
}
