const request = require('supertest');
const app = require('../app');

describe('Google Sheets Sync Endpoint', () => {
  test('POST /api/settings/sync-sheets without auth returns 401', async () => {
    const res = await request(app).post('/api/settings/sync-sheets').send({
      googleWebAppUrl: 'https://script.google.com/macros/s/AKfycbwWTolkQqA0LXgLwTYj8vnWMoEHQeonlhCc7-8RDEXgnGzZG6C22wK_RInl6Gkh0t3o8A/exec',
      payload: {
        action: 'dashboard_export',
        timestamp: new Date().toLocaleString(),
        metrics: []
      }
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
