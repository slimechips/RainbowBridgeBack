import express from 'express';
import bodyParser from 'body-parser';

const svc = 'web';
process.env.SVC = `${svc}-svc`;
import { endpoints } from 'common-util/configs';
import { reqLogger } from 'common-util/logger';
import { errorHandler } from 'common-util/error';

// Controllers
import * as authController from './controllers/auth';
import * as webController from './controllers/webroute';
import * as agentController from './controllers/agent';

const app: express.Application = express();

// Engine Setup
app.use(bodyParser.urlencoded({ extended: true })); // Body Parser Middle Ware
app.use(bodyParser.json()); // Body Parser Middle Ware
app.use(reqLogger); // Logger Middleware

// Auth controller routes
authController.router.get('/token', authController.getToken);

// Init user controller internal routes here
webController.router.post('/newsupportreq', webController.postSupportReq);

// Init agent Controller routes here
agentController.router.get('/checkforrequest/:agentId',
  agentController.getCheckForRequest);

// Add custom controller routes here
app.use('/user', webController.router);
app.use('/auth', authController.router);
app.use('/agent', agentController.router);

// Error Handling Middleware goes here
app.use(errorHandler);

app.listen(endpoints[svc].http_port, () => {
  console.log(`App listening on port ${endpoints[svc].http_port}`);
});

module.exports = {
  app,
};
