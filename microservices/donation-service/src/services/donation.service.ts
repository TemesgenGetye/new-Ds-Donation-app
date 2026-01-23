import { supabase } from '../config/database';
import { publishEvent } from '../config/messaging';
import { logger } from '../utils/logger';
import { Donation, CreateDonationDTO, UpdateDonationDTO } from '../models/donation.model';

export class DonationService {
  async createDonation(data: CreateDonationDTO): Promise<Donation> {
    try {
      const { data: donation, error } = await supabase
        .from('donations')
        .insert({
          ...data,
          status: data.status || 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Publish event
      await publishEvent('donation.created', {
        donationId: donation.id,
        donorId: donation.donor_id,
        title: donation.title,
        category: donation.category,
        status: donation.status,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Donation created: ${donation.id}`);
      return donation;
    } catch (error: any) {
      logger.error('Error creating donation:', error);
      throw error;
    }
  }

  async getDonations(filters?: {
    status?: string;
    category?: string;
    donor_id?: string;
  }): Promise<Donation[]> {
    try {
      let query = supabase.from('donations').select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.donor_id) {
        query = query.eq('donor_id', filters.donor_id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      logger.error('Error fetching donations:', error);
      throw error;
    }
  }

  async getDonationById(id: string): Promise<Donation | null> {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      logger.error(`Error fetching donation ${id}:`, error);
      throw error;
    }
  }

  async updateDonation(id: string, data: UpdateDonationDTO): Promise<Donation> {
    try {
      const oldDonation = await this.getDonationById(id);
      if (!oldDonation) {
        throw new Error('Donation not found');
      }

      const { data: donation, error } = await supabase
        .from('donations')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Publish status change event if status changed
      if (data.status && data.status !== oldDonation.status) {
        await publishEvent('donation.status.changed', {
          donationId: id,
          oldStatus: oldDonation.status,
          newStatus: data.status,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Donation updated: ${id}`);
      return donation;
    } catch (error: any) {
      logger.error(`Error updating donation ${id}:`, error);
      throw error;
    }
  }

  async deleteDonation(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('donations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await publishEvent('donation.deleted', {
        donationId: id,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Donation deleted: ${id}`);
    } catch (error: any) {
      logger.error(`Error deleting donation ${id}:`, error);
      throw error;
    }
  }
}

