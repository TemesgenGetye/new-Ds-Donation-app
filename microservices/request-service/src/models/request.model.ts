export interface RequestEntity {
  id: string;
  donation_id: string;
  recipient_id: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface CreateRequestDTO {
  donation_id: string;
  recipient_id: string;
  message: string;
  status?: "pending" | "approved" | "rejected";
}

export interface UpdateRequestDTO {
  message?: string;
  status?: "pending" | "approved" | "rejected";
}

