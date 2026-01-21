const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');

describe('Checking Task Management API', () => {
    afterAll(async () => {
        await mongoose.disconnect();
    });

    it('GET / should return success message', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Task Management API');
    });
});
