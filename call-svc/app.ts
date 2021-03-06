import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

const svc = 'call';
process.env.SVC = `${svc}-svc`;
import { endpoints } from 'common-util/configs';
import { reqLogger } from 'common-util/logger';
import { errorHandler } from 'common-util/error';

// Controllers
import * as authController from './controllers/auth';
import * as schController from './controllers/scheduler';

const app: express.Application = express();

// Engine Setup
app.use(bodyParser.urlencoded({ extended: true })); // Body Parser Middle Ware
app.use(bodyParser.json()); // Body Parser Middle Ware
app.use(cors({ origin: '*' })); // Cors middleware
app.use(reqLogger); // Logger Middleware

// Init user controller internal routes here
authController.router.get('/token', authController.getToken);
authController.router.get('/validate', authController.getValidateToken);

// Init Scheduler controller internal routes here
schController.router.post('/reqagent', schController.postReqAgent);
schController.router.get('/clearreqs', schController.getDeleteReqs);
schController.router.get('/untagagent/:agentId', schController.getUntagAgent);

// Add custom controller routes here
app.use('/auth', authController.router);
app.use('/scheduler', schController.router);

// Error Handling Middleware goes here
app.use(errorHandler);

app.listen(endpoints[svc].http_port, () => {
  console.log(`App listening on port ${endpoints[svc].http_port}`);
});

setTimeout(() => schController.deleteReqs(true, true), 5000);

module.exports = {
  app,
};
