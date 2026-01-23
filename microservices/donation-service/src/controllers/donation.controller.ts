import { Request, Response } from 'express';
import { DonationService } from '../services/donation.service';
import { logger } from '../utils/logger';

const donationService = new DonationService();

export class DonationController {
  async createDonation(req: Request, res: Response): Promise<void> {
    try {
      const donation = await donationService.createDonation(req.body);
      res.status(201).json(donation);
    } catch (error: any) {
      logger.error('Create donation error:', error);
      res.status(400).json({ error: error.message || 'Failed to create donation' });
    }
  }

  async getDonations(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        category: req.query.category as string | undefined,
        donor_id: req.query.donor_id as string | undefined,
      };

      const donations = await donationService.getDonations(filters);
      res.status(200).json(donations);
    } catch (error: any) {
      logger.error('Get donations error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch donations' });
    }
  }

  async getDonationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const donation = await donationService.getDonationById(id);

      if (!donation) {
        res.status(404).json({ error: 'Donation not found' });
        return;
      }

      res.status(200).json(donation);
    } catch (error: any) {
      logger.error('Get donation by ID error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch donation' });
    }
  }

  async updateDonation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const donation = await donationService.updateDonation(id, req.body);
      res.status(200).json(donation);
    } catch (error: any) {
      logger.error('Update donation error:', error);
      res.status(400).json({ error: error.message || 'Failed to update donation' });
    }
  }

  async deleteDonation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await donationService.deleteDonation(id);
      res.status(204).send();
    } catch (error: any) {
      logger.error('Delete donation error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete donation' });
    }
  }
}

