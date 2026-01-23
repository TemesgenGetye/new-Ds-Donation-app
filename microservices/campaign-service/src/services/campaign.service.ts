import { supabase } from '../config/database';
import { publishEvent } from '../config/messaging';
import { Campaign, ContributeDTO, CreateCampaignDTO, UpdateCampaignDTO } from '../models/campaign.model';
import { logger } from '../utils/logger';

export class CampaignService {
  async createCampaign(data: CreateCampaignDTO): Promise<Campaign> {
    try {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          ...data,
          collected_amount: data.collected_amount || 0,
          status: data.status || 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Publish event (don't fail campaign creation if publish fails)
      try {
        await publishEvent('campaign.created', {
          campaignId: campaign.id,
          recipientId: campaign.recipient_id,
          title: campaign.title,
          goalAmount: campaign.goal_amount,
          timestamp: new Date().toISOString(),
        });
        logger.info(`✅ Event published for campaign: ${campaign.id}`);
      } catch (publishError: any) {
        logger.error(`⚠️ Failed to publish event for campaign ${campaign.id}:`, publishError);
        // Don't throw - campaign creation should succeed even if event publish fails
      }

      logger.info(`Campaign created: ${campaign.id}`);
      return campaign;
    } catch (error: any) {
      logger.error('Error creating campaign:', error);
      throw error;
    }
  }

  async getCampaigns(filters?: {
    status?: string;
    category?: string;
    recipient_id?: string;
  }): Promise<Campaign[]> {
    try {
      let query = supabase.from('campaigns').select('*');

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.recipient_id) {
        query = query.eq('recipient_id', filters.recipient_id);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      logger.error('Error fetching campaigns:', error);
      throw error;
    }
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      logger.error(`Error fetching campaign ${id}:`, error);
      throw error;
    }
  }

  async updateCampaign(id: string, data: UpdateCampaignDTO): Promise<Campaign> {
    try {
      const oldCampaign = await this.getCampaignById(id);
      if (!oldCampaign) {
        throw new Error('Campaign not found');
      }

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Publish status change event if status changed
      if (data.status && data.status !== oldCampaign.status) {
        await publishEvent('campaign.status.changed', {
          campaignId: id,
          oldStatus: oldCampaign.status,
          newStatus: data.status,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Campaign updated: ${id}`);
      return campaign;
    } catch (error: any) {
      logger.error(`Error updating campaign ${id}:`, error);
      throw error;
    }
  }

  async contributeToCampaign(id: string, contribution: ContributeDTO): Promise<Campaign> {
    try {
      const campaign = await this.getCampaignById(id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const newCollectedAmount = (campaign.collected_amount || 0) + contribution.amount;

      const { data: updatedCampaign, error } = await supabase
        .from('campaigns')
        .update({
          collected_amount: newCollectedAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Publish contribution event
      await publishEvent('campaign.contributed', {
        campaignId: id,
        amount: contribution.amount,
        totalCollected: newCollectedAmount,
        timestamp: new Date().toISOString(),
      });

      // Check if goal is reached
      if (campaign.goal_amount && newCollectedAmount >= campaign.goal_amount) {
        await publishEvent('campaign.completed', {
          campaignId: id,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info(`Contribution added to campaign ${id}: ${contribution.amount}`);
      return updatedCampaign;
    } catch (error: any) {
      logger.error(`Error contributing to campaign ${id}:`, error);
      throw error;
    }
  }

  async deleteCampaign(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await publishEvent('campaign.deleted', {
        campaignId: id,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Campaign deleted: ${id}`);
    } catch (error: any) {
      logger.error(`Error deleting campaign ${id}:`, error);
      throw error;
    }
  }
}

