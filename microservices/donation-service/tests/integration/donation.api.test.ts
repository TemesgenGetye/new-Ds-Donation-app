import request from 'supertest';
import express from 'express';
import donationRoutes from '../../src/routes/donation.routes';
import healthRoutes from '../../src/routes/health.routes';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/donations', donationRoutes);
app.use('/health', healthRoutes);

describe('Donation API Integration Tests', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('service', 'donation-service');
    });
  });

  describe('POST /api/donations', () => {
    it('should validate required fields', async () => {
      const response = await request(app).post('/api/donations').send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate UUID format for donor_id', async () => {
      const response = await request(app)
        .post('/api/donations')
        .send({
          donor_id: 'invalid-uuid',
          title: 'Test',
          description: 'Test',
          category: 'Food',
          location: 'Addis Ababa',
        });
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/donations', () => {
    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/donations')
        .query({ status: 'available', category: 'Food' });
      // Status depends on database connection, but should not be 400
      expect(response.status).not.toBe(400);
    });
  });
});

