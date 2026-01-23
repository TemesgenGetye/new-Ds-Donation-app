export interface Donation {
  id: string;
  donor_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  image_url: string | null;
  status: 'pending' | 'available' | 'claimed' | 'completed' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CreateDonationDTO {
  donor_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  image_url?: string | null;
  status?: 'pending' | 'available';
}

export interface UpdateDonationDTO {
  title?: string;
  description?: string;
  category?: string;
  location?: string;
  image_url?: string | null;
  status?: 'pending' | 'available' | 'claimed' | 'completed' | 'rejected';
}

