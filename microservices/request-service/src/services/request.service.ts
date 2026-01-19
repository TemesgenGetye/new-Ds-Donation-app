import { supabase } from "../config/database";
import { publishEvent } from "../config/messaging";
import { logger } from "../utils/logger";
import {
  CreateRequestDTO,
  RequestEntity,
  UpdateRequestDTO,
} from "../models/request.model";

export class RequestService {
  async createRequest(data: CreateRequestDTO): Promise<RequestEntity> {
    try {
      const { data: request, error } = await supabase
        .from("requests")
        .insert({
          donation_id: data.donation_id,
          recipient_id: data.recipient_id,
          message: data.message,
          status: data.status || "pending",
        })
        .select()
        .single();

      if (error) throw error;

      await publishEvent("request.created", {
        requestId: request.id,
        donationId: request.donation_id,
        recipientId: request.recipient_id,
        status: request.status,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Request created: ${request.id}`);
      return request;
    } catch (error: any) {
      logger.error("Error creating request:", error);
      throw error;
    }
  }

  async getRequests(filters?: {
    donation_id?: string;
    recipient_id?: string;
    status?: string;
  }): Promise<RequestEntity[]> {
    try {
      let query = supabase.from("requests").select("*");

      if (filters?.donation_id) {
        query = query.eq("donation_id", filters.donation_id);
      }
      if (filters?.recipient_id) {
        query = query.eq("recipient_id", filters.recipient_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      logger.error("Error fetching requests:", error);
      throw error;
    }
  }

  async getRequestById(id: string): Promise<RequestEntity | null> {
    try {
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      logger.error(`Error fetching request ${id}:`, error);
      throw error;
    }
  }

  async updateRequest(
    id: string,
    data: UpdateRequestDTO
  ): Promise<RequestEntity> {
    try {
      const oldRequest = await this.getRequestById(id);
      if (!oldRequest) {
        throw new Error("Request not found");
      }

      const { data: request, error } = await supabase
        .from("requests")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (data.status && data.status !== oldRequest.status) {
        await publishEvent("request.status.changed", {
          requestId: id,
          oldStatus: oldRequest.status,
          newStatus: data.status,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Request updated: ${id}`);
      return request;
    } catch (error: any) {
      logger.error(`Error updating request ${id}:`, error);
      throw error;
    }
  }
}

