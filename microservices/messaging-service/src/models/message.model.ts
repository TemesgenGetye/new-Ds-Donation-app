export interface Message {
  id: string;
  campaign_id: string | null;
  donation_id: string | null;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface CreateMessageDTO {
  campaign_id?: string | null;
  donation_id?: string | null;
  sender_id: string;
  receiver_id: string;
  content: string;
}

export interface UpdateMessageReadDTO {
  read: boolean;
}

