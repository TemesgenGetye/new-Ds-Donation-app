import { Request, Response } from "express";
import { RequestService } from "../services/request.service";
import { logger } from "../utils/logger";

const requestService = new RequestService();

export class RequestController {
  async createRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = await requestService.createRequest(req.body);
      res.status(201).json(request);
    } catch (error: any) {
      logger.error("Create request error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to create request" });
    }
  }

  async getRequests(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        donation_id: req.query.donation_id as string | undefined,
        recipient_id: req.query.recipient_id as string | undefined,
        status: req.query.status as string | undefined,
      };

      const requests = await requestService.getRequests(filters);
      res.status(200).json(requests);
    } catch (error: any) {
      logger.error("Get requests error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch requests" });
    }
  }

  async getRequestById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request = await requestService.getRequestById(id);

      if (!request) {
        res.status(404).json({ error: "Request not found" });
        return;
      }

      res.status(200).json(request);
    } catch (error: any) {
      logger.error("Get request by ID error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch request" });
    }
  }

  async updateRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request = await requestService.updateRequest(id, req.body);
      res.status(200).json(request);
    } catch (error: any) {
      logger.error("Update request error:", error);
      res
        .status(400)
        .json({ error: error.message || "Failed to update request" });
    }
  }
}

