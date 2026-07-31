const request = require('supertest');
const app = require('../app');

describe('API auth and access controls', () => {
  test('POST /api/auth/signup returns disabled response', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test',
      email: 'test@example.com',
      password: 'password123'
    });

    expect(res.status).toBe(404);
  });

  test('POST /api/auth/login validates required fields', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: '',
      password: ''
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me without auth returns 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('PUT /api/settings without auth returns 401', async () => {
    const res = await request(app).put('/api/settings').send({
      noticeStrip: { text: 'hello', enabled: true }
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
