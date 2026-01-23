import { DonationService } from '../../src/services/donation.service';
import { supabase } from '../../src/config/database';
import { publishEvent } from '../../src/config/messaging';

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/config/messaging');

describe('DonationService', () => {
  let donationService: DonationService;

  beforeEach(() => {
    donationService = new DonationService();
    jest.clearAllMocks();
  });

  describe('createDonation', () => {
    it('should create a donation successfully', async () => {
      const mockDonation = {
        id: '123',
        donor_id: 'donor-123',
        title: 'Test Donation',
        description: 'Test Description',
        category: 'Food',
        location: 'Addis Ababa',
        image_url: null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockDonation, error: null }),
          }),
        }),
      });

      (publishEvent as jest.Mock).mockResolvedValue(undefined);

      const result = await donationService.createDonation({
        donor_id: 'donor-123',
        title: 'Test Donation',
        description: 'Test Description',
        category: 'Food',
        location: 'Addis Ababa',
      });

      expect(result).toEqual(mockDonation);
      expect(publishEvent).toHaveBeenCalledWith('donation.created', expect.any(Object));
    });

    it('should throw error if creation fails', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(
        donationService.createDonation({
          donor_id: 'donor-123',
          title: 'Test',
          description: 'Test',
          category: 'Food',
          location: 'Addis Ababa',
        })
      ).rejects.toThrow();
    });
  });

  describe('getDonations', () => {
    it('should fetch donations with filters', async () => {
      const mockDonations = [
        {
          id: '1',
          donor_id: 'donor-123',
          title: 'Donation 1',
          status: 'available',
        },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockDonations, error: null }),
          }),
        }),
      });

      const result = await donationService.getDonations({ status: 'available' });

      expect(result).toEqual(mockDonations);
    });
  });
});

