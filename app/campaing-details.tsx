import ReportModal from "@/components/ReportModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Flag,
  MapPin,
  MessageCircle,
  Send,
  User,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CampaignDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<any>(null);
  const [unreadConversations, setUnreadConversations] = useState<Set<string>>(
    new Set()
  );
  const [chatVisible, setChatVisible] = useState(false);
  const [chatAnimation] = useState(new Animated.Value(0));
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [reportModal, setReportModal] = useState({
    visible: false,
    reportedId: "",
    reportedName: "",
    type: "campaign" as "user" | "donation" | "campaign" | "request",
  });

  const recipientId = params.recipientId as string;
  const campaignId = params.id as string;
  const isRecipient = profile?.id === recipientId;

  useEffect(() => {
    if (profile) {
      fetchMessages();
    }
  }, [profile]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel(`messages_for_${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const newMessage = payload.new as any;

          // Ignore our own messages
          if (!profile || newMessage.sender_id === profile.id) {
            fetchMessages();
            return;
          }

          // For the recipient, if they are not in the sender's chat, mark as unread
          if (isRecipient) {
            if (!selectedDonor || selectedDonor.id !== newMessage.sender_id) {
              setUnreadConversations((prev) =>
                new Set(prev).add(newMessage.sender_id)
              );
            }
          }

          // Refetch to get latest conversations or messages
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, campaignId, selectedDonor]);

  useEffect(() => {
    if (selectedDonor) {
      const relevantConversation = conversations.find(
        (c) => c.donor.id === selectedDonor.id
      );
      setMessages(relevantConversation ? relevantConversation.messages : []);
    } else {
      setMessages([]);
    }
  }, [selectedDonor, conversations]);

  const fetchMessages = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      if (isRecipient) {
        // Recipient: Fetch all conversations using the new RPC function
        const { data, error } = await supabase.rpc(
          "get_campaign_conversations",
          {
            p_campaign_id: campaignId,
            p_user_id: profile.id,
          }
        );

        if (error) throw error;

        const convos = (data || []).map((convo: any) => ({
          donor: {
            id: convo.other_user_id,
            full_name: convo.other_user_name,
          },
          messages: convo.messages,
          lastMessage: {
            content: convo.last_message_content,
            created_at: convo.last_message_at,
          },
        }));

        setConversations(convos);
      } else {
        // Donor: Fetch 1-to-1 chat history with the recipient
        const { data, error } = await supabase
          .from("messages")
          .select(`*, sender:sender_id(id, full_name)`)
          .eq("campaign_id", campaignId)
          .or(
            `and(sender_id.eq.${profile.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${profile.id})`
          )
          .order("created_at", { ascending: false });

        if (error) throw error;
        setMessages(data || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!profile || !messageText.trim()) return;
    const textToSend = messageText.trim();
    setMessageText("");

    let currentRecipientId = recipientId;
    if (isRecipient && selectedDonor) {
      currentRecipientId = selectedDonor.id;
    }

    // Create the new message object
    const newMessage = {
      id: Date.now().toString(), // Temporary ID
      campaign_id: campaignId,
      sender_id: profile.id,
      receiver_id: currentRecipientId,
      content: textToSend,
      created_at: new Date().toISOString(),
      sender: { id: profile.id, full_name: profile.full_name },
    };

    // Add message to local state immediately
    if (isRecipient && selectedDonor) {
      // Update conversations for recipient
      setConversations((prev) =>
        prev.map((convo) => {
          if (convo.donor.id === selectedDonor.id) {
            return {
              ...convo,
              messages: [newMessage, ...convo.messages],
              lastMessage: {
                content: textToSend,
                created_at: new Date().toISOString(),
              },
            };
          }
          return convo;
        })
      );
      setMessages((prev) => [newMessage, ...prev]);
    } else {
      // Update messages for donor
      setMessages((prev) => [newMessage, ...prev]);
    }

    try {
      const { error } = await supabase.from("messages").insert({
        campaign_id: campaignId,
        sender_id: profile.id,
        receiver_id: currentRecipientId,
        content: textToSend,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message.");
      setMessageText(textToSend); // Re-set text if sending failed
    }
  };

  const handleReportCampaign = () => {
    setReportModal({
      visible: true,
      reportedId: params.id as string,
      reportedName: params.title as string,
      type: "campaign",
    });
  };

  const toggleChat = () => {
    const toValue = chatVisible ? 0 : 1;
    setChatVisible(!chatVisible);

    Animated.timing(chatAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#10B981";
      case "paused":
        return "#F59E0B";
      case "completed":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="#ffffff"
        barStyle="dark-content"
        translucent={false}
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campaign Details</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {params.imageUrl && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: params.imageUrl as string }}
                style={styles.image}
              />
              <View style={styles.imageOverlay} />
            </View>
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

            {params.goalAmount && (
              <View style={styles.goalContainer}>
                <DollarSign size={20} color="#10B981" />
                <Text style={styles.goalText}>Goal: ${params.goalAmount}</Text>
              </View>
            )}

            <Text style={styles.description}>{params.description}</Text>

            <View style={styles.recipientSection}>
              <View style={styles.recipientInfo}>
                <View style={styles.recipientAvatar}>
                  <User size={16} color="#2563EB" />
                </View>
                <Text style={styles.recipientName}>{params.recipientName}</Text>
              </View>
              {profile?.role === "donor" && (
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={handleReportCampaign}
                >
                  <Flag size={16} color="#EF4444" />
                  <Text style={styles.reportButtonText}>Report</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Chat Toggle Button */}
          <TouchableOpacity
            style={styles.chatToggleButton}
            onPress={toggleChat}
            activeOpacity={0.8}
          >
            <View style={styles.chatToggleContent}>
              <MessageCircle size={20} color="#3B82F6" />
              <Text style={styles.chatToggleText}>
                {isRecipient ? "Conversations" : "Chat"}
              </Text>
              <View style={styles.chatToggleBadge}>
                {isRecipient && conversations.length > 0 && (
                  <Text style={styles.chatToggleBadgeText}>
                    {conversations.length}
                  </Text>
                )}
                {!isRecipient && messages.length > 0 && (
                  <Text style={styles.chatToggleBadgeText}>
                    {messages.length}
                  </Text>
                )}
              </View>
            </View>
            {chatVisible ? (
              <ChevronDown size={20} color="#64748B" />
            ) : (
              <ChevronUp size={20} color="#64748B" />
            )}
          </TouchableOpacity>

          {/* Collapsible Chat Section */}
          <Animated.View
            style={[
              styles.chatContainer,
              {
                height: chatAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.max(600, 400 + keyboardHeight)], // Adjust height based on keyboard
                }),
                opacity: chatAnimation,
              },
            ]}
          >
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
              </View>
            )}
            {isRecipient ? (
              selectedDonor ? (
                // Chat view
                <>
                  <View style={styles.chatHeader}>
                    <TouchableOpacity
                      onPress={() => setSelectedDonor(null)}
                      style={styles.backToConversations}
                    >
                      <ArrowLeft size={20} color="#1F2937" />
                      <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.chatHeaderName}>
                      {selectedDonor.full_name}
                    </Text>
                    <View style={{ width: 60 }} />
                  </View>
                  <ScrollView
                    style={styles.messagesContainer}
                    contentContainerStyle={{ flexDirection: "column-reverse" }}
                    showsVerticalScrollIndicator={false}
                  >
                    {messages.length === 0 ? (
                      <View style={styles.emptyChatContainer}>
                        <Text style={styles.emptyChatEmoji}>💬</Text>
                        <Text style={styles.emptyChatText}>
                          No messages yet
                        </Text>
                        <Text style={styles.emptyChatSubtext}>
                          Start a conversation!
                        </Text>
                      </View>
                    ) : (
                      messages.map((msg) => (
                        <View
                          key={msg.id}
                          style={[
                            styles.messageBubble,
                            msg.sender_id === profile?.id
                              ? styles.myMessage
                              : styles.theirMessage,
                          ]}
                        >
                          <Text
                            style={
                              msg.sender_id === profile?.id
                                ? styles.myMessageText
                                : styles.theirMessageText
                            }
                          >
                            {msg.content}
                          </Text>
                        </View>
                      ))
                    )}
                  </ScrollView>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.textInput}
                      value={messageText}
                      onChangeText={setMessageText}
                      placeholder="Type your message..."
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        !messageText.trim() && styles.sendButtonDisabled,
                      ]}
                      onPress={handleSendMessage}
                      disabled={!messageText.trim()}
                    >
                      <Send
                        size={20}
                        color={messageText.trim() ? "#FFFFFF" : "#9CA3AF"}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // Conversations list
                <View style={styles.conversationsContainer}>
                  <View style={styles.conversationsHeader}>
                    <MessageCircle size={20} color="#2563EB" />
                    <Text style={styles.conversationsTitle}>Conversations</Text>
                  </View>
                  {conversations.length === 0 ? (
                    <View style={styles.emptyConversationsContainer}>
                      <Text style={styles.emptyConversationsEmoji}>🤝</Text>
                      <Text style={styles.emptyConversationsText}>
                        No conversations yet
                      </Text>
                      <Text style={styles.emptyConversationsSubtext}>
                        Donors will appear here when they message you
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.conversationsList}
                      showsVerticalScrollIndicator={false}
                    >
                      {conversations.map(({ donor, lastMessage }) => (
                        <TouchableOpacity
                          key={donor.id}
                          style={styles.conversationCard}
                          onPress={() => {
                            // When opening a convo, remove it from unread
                            setUnreadConversations((prev) => {
                              const newSet = new Set(prev);
                              newSet.delete(donor.id);
                              return newSet;
                            });
                            setSelectedDonor(donor);
                          }}
                        >
                          <View style={styles.conversationAvatar}>
                            <User size={16} color="#2563EB" />
                          </View>
                          <View style={styles.conversationContent}>
                            <View style={styles.conversationHeader}>
                              <Text style={styles.senderName}>
                                {donor.full_name}
                              </Text>
                              <Text style={styles.messageDate}>
                                {new Date(
                                  lastMessage.created_at
                                ).toLocaleDateString()}
                              </Text>
                            </View>
                            <Text
                              style={styles.messageContent}
                              numberOfLines={1}
                            >
                              {lastMessage.content}
                            </Text>
                          </View>
                          {unreadConversations.has(donor.id) && (
                            <View style={styles.unreadDot} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )
            ) : (
              <>
                <View style={styles.chatHeader}>
                  <MessageCircle size={20} color="#2563EB" />
                  <Text style={styles.chatHeaderName}>
                    Chat with {params.recipientName}
                  </Text>
                </View>
                <ScrollView
                  style={styles.messagesContainer}
                  contentContainerStyle={{ flexDirection: "column-reverse" }}
                  showsVerticalScrollIndicator={false}
                >
                  {loading && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                  )}
                  {messages.length === 0 ? (
                    <View style={styles.emptyChatContainer}>
                      <Text style={styles.emptyChatEmoji}>💬</Text>
                      <Text style={styles.emptyChatText}>No messages yet</Text>
                      <Text style={styles.emptyChatSubtext}>
                        Start a conversation with the recipient!
                      </Text>
                    </View>
                  ) : (
                    messages.map((msg) => (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageBubble,
                          msg.sender_id === profile?.id
                            ? styles.myMessage
                            : styles.theirMessage,
                        ]}
                      >
                        <Text
                          style={
                            msg.sender_id === profile?.id
                              ? styles.myMessageText
                              : styles.theirMessageText
                          }
                        >
                          {msg.content}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Type your message..."
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      !messageText.trim() && styles.sendButtonDisabled,
                    ]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim()}
                  >
                    <Send
                      size={20}
                      color={messageText.trim() ? "#FFFFFF" : "#9CA3AF"}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

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
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    height: 250,
  },
  image: {
    width: "100%",
    height: "100%",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  details: {
    padding: 24,
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
    marginRight: 16,
    lineHeight: 32,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "capitalize",
  },
  metaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 6,
    fontWeight: "500",
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginRight: 12,
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3B82F6",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  goalContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  goalText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16A34A",
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    color: "#475569",
    lineHeight: 26,
    marginBottom: 24,
    fontWeight: "400",
  },
  recipientSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  recipientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recipientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#DBEAFE",
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  reportButtonText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    marginLeft: 6,
  },
  chatContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
    minHeight: 0,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  backToConversations: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  backText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
    marginLeft: 6,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F8FAFC",
  },
  messageBubble: {
    padding: 16,
    borderRadius: 20,
    marginVertical: 6,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  myMessage: {
    backgroundColor: "#3B82F6",
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
  },
  theirMessage: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  myMessageText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },
  theirMessageText: {
    color: "#1E293B",
    fontSize: 15,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    position: "relative",
    zIndex: 1000,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 24,
    paddingHorizontal: 20,
    marginRight: 12,
    fontSize: 16,
    backgroundColor: "#F8FAFC",
  },
  sendButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyChatEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyChatText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptyChatSubtext: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  conversationsContainer: {
    flex: 1,
  },
  conversationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  conversationsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  conversationsList: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F8FAFC",
  },
  conversationCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "#DBEAFE",
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  senderName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  messageDate: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  messageContent: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    marginLeft: 12,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyConversationsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyConversationsEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyConversationsText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptyConversationsSubtext: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  chatToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  chatToggleContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatToggleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  chatToggleBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    minWidth: 20,
    alignItems: "center",
  },
  chatToggleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
