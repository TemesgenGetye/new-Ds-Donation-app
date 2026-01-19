import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Users() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, blocked")
      .neq("id", profile?.id) // exclude self (admin)
      .order("full_name", { ascending: true });
    if (error) {
      Alert.alert("Error", "Failed to fetch users");
      setLoading(false);
      return;
    }
    setUsers(data || []);
    setLoading(false);
  };

  const toggleBlock = async (userId: string, blocked: boolean) => {
    setUpdating(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ blocked: !blocked })
      .eq("id", userId);
    if (error) {
      Alert.alert("Error", "Failed to update user status");
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, blocked: !blocked } : u))
      );
    }
    setUpdating(null);
  };

  if (profile?.role !== "admin") {
    return (
      <View style={styles.centered}>
        <Text>Access denied. Admins only.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 20,
          paddingVertical: 20,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#1F2937",
            marginTop: 20,
          }}
        >
          Users
        </Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.role}>Role: {item.role}</Text>
            <Text style={styles.status}>
              Status: {item.blocked ? "Blocked" : "Active"}
            </Text>
            <TouchableOpacity
              style={[
                styles.button,
                item.blocked ? styles.unblock : styles.block,
              ]}
              onPress={() => toggleBlock(item.id, item.blocked)}
              disabled={updating === item.id}
            >
              <Text style={styles.buttonText}>
                {updating === item.id
                  ? "Updating..."
                  : item.blocked
                  ? "Unblock"
                  : "Block"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 32 }}>
            No users found.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  role: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 2,
  },
  status: {
    fontSize: 13,
    color: "#F59E0B",
    marginBottom: 8,
  },
  button: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  block: {
    backgroundColor: "#EF4444",
  },
  unblock: {
    backgroundColor: "#10B981",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
