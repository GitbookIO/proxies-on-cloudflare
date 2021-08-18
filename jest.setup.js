// Setup mocks for Request/Response
const makeServiceWorkerEnv = require('service-worker-mock');

Object.assign(global, makeServiceWorkerEnv());