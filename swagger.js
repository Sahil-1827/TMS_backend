const dotenv = require('dotenv');
dotenv.config();
const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Task Management System API',
        description: 'API Documentation for the Task Management System',
        version: '1.0.0',
    },
    host: process.env.BASE_URL,
    basePath: '',
    schemes: ['http', 'https'],
    securityDefinitions: {
        bearerAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
            description: 'Enter your bearer token in the format **Bearer &lt;token&gt;**',
        },
    },
    security: [{ bearerAuth: [] }],
};

const outputFile = './swagger-output.json';
const routes = ['./server.js'];

swaggerAutogen(outputFile, routes, doc);