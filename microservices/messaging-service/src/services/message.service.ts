import { supabase } from "../config/database";
import { publishEvent } from "../config/messaging";
import { logger } from "../utils/logger";
import {
  CreateMessageDTO,
  Message,
  UpdateMessageReadDTO,
} from "../models/message.model";

export class MessageService {
  async createMessage(data: CreateMessageDTO): Promise<Message> {
    try {
      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          campaign_id: data.campaign_id ?? null,
          donation_id: data.donation_id ?? null,
          sender_id: data.sender_id,
          receiver_id: data.receiver_id,
          content: data.content,
          read: false,
        })
        .select()
        .single();

      if (error) throw error;

      await publishEvent("message.sent", {
        messageId: message.id,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        donationId: message.donation_id,
        campaignId: message.campaign_id,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Message created: ${message.id}`);
      return message;
    } catch (error: any) {
      logger.error("Error creating message:", error);
      throw error;
    }
  }

  async getMessages(filters?: {
    sender_id?: string;
    receiver_id?: string;
    donation_id?: string;
    campaign_id?: string;
  }): Promise<Message[]> {
    try {
      let query = supabase.from("messages").select("*");

      if (filters?.sender_id) {
        query = query.eq("sender_id", filters.sender_id);
      }

      if (filters?.receiver_id) {
        query = query.eq("receiver_id", filters.receiver_id);
      }

      if (filters?.donation_id) {
        query = query.eq("donation_id", filters.donation_id);
      }

      if (filters?.campaign_id) {
        query = query.eq("campaign_id", filters.campaign_id);
      }

      query = query.order("created_at", { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      logger.error("Error fetching messages:", error);
      throw error;
    }
  }

  async markAsRead(id: string): Promise<Message> {
    try {
      const { data: message, error } = await supabase
        .from("messages")
        .update({
          read: true,
        } as UpdateMessageReadDTO)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      await publishEvent("message.read", {
        messageId: id,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Message marked as read: ${id}`);
      return message;
    } catch (error: any) {
      logger.error(`Error marking message ${id} as read:`, error);
      throw error;
    }
  }
}

