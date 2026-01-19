import { Request, Response } from "express";
import { MessageService } from "../services/message.service";
import { logger } from "../utils/logger";

const messageService = new MessageService();

export class MessageController {
  async createMessage(req: Request, res: Response): Promise<void> {
    try {
      const message = await messageService.createMessage(req.body);
      res.status(201).json(message);
    } catch (error: any) {
      logger.error("Create message error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to create message" });
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        sender_id: req.query.sender_id as string | undefined,
        receiver_id: req.query.receiver_id as string | undefined,
        donation_id: req.query.donation_id as string | undefined,
        campaign_id: req.query.campaign_id as string | undefined,
      };

      const messages = await messageService.getMessages(filters);
      res.status(200).json(messages);
    } catch (error: any) {
      logger.error("Get messages error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch messages" });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const message = await messageService.markAsRead(id);
      res.status(200).json(message);
    } catch (error: any) {
      logger.error("Mark message as read error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to mark message as read" });
    }
  }
}

