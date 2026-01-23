export interface Campaign {
  id: string;
  recipient_id: string;
  title: string;
  description: string;
  goal_amount: number | null;
  collected_amount: number | null;
  category: string;
  location: string;
  image_url: string | null;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignDTO {
  recipient_id: string;
  title: string;
  description: string;
  goal_amount?: number | null;
  collected_amount?: number | null;
  category: string;
  location: string;
  image_url?: string | null;
  status?: 'pending' | 'active';
}

export interface UpdateCampaignDTO {
  title?: string;
  description?: string;
  goal_amount?: number | null;
  collected_amount?: number | null;
  category?: string;
  location?: string;
  image_url?: string | null;
  status?: 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
}

export interface ContributeDTO {
  amount: number;
}

