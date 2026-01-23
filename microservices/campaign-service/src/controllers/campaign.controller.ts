import { Request, Response } from 'express';
import { CampaignService } from '../services/campaign.service';
import { logger } from '../utils/logger';

const campaignService = new CampaignService();

export class CampaignController {
  async createCampaign(req: Request, res: Response): Promise<void> {
    try {
      const campaign = await campaignService.createCampaign(req.body);
      res.status(201).json(campaign);
    } catch (error: any) {
      logger.error('Create campaign error:', error);
      res.status(400).json({ error: error.message || 'Failed to create campaign' });
    }
  }

  async getCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        category: req.query.category as string | undefined,
        recipient_id: req.query.recipient_id as string | undefined,
      };

      const campaigns = await campaignService.getCampaigns(filters);
      res.status(200).json(campaigns);
    } catch (error: any) {
      logger.error('Get campaigns error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch campaigns' });
    }
  }

  async getCampaignById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await campaignService.getCampaignById(id);

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      res.status(200).json(campaign);
    } catch (error: any) {
      logger.error('Get campaign by ID error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch campaign' });
    }
  }

  async updateCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await campaignService.updateCampaign(id, req.body);
      res.status(200).json(campaign);
    } catch (error: any) {
      logger.error('Update campaign error:', error);
      res.status(400).json({ error: error.message || 'Failed to update campaign' });
    }
  }

  async contributeToCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await campaignService.contributeToCampaign(id, req.body);
      res.status(200).json(campaign);
    } catch (error: any) {
      logger.error('Contribute to campaign error:', error);
      res.status(400).json({ error: error.message || 'Failed to contribute to campaign' });
    }
  }

  async deleteCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await campaignService.deleteCampaign(id);
      res.status(204).send();
    } catch (error: any) {
      logger.error('Delete campaign error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete campaign' });
    }
  }
}

