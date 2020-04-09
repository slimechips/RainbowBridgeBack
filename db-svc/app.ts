import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

const svc = 'db';
process.env.SVC = `${svc}-svc`;
import { endpoints } from 'common-util/configs';
import { reqLogger } from 'common-util/logger';
import { errorHandler } from 'common-util/error';

// Controllers
import * as supportReqCnt from './controllers/supportreq';

const app: express.Application = express();

// Engine Setup
app.use(bodyParser.urlencoded({ extended: true })); // Body Parser Middle Ware
app.use(bodyParser.json()); // Body Parser Middle Ware
app.use(cors({ origin: '*' })); // Cors middleware
app.use(reqLogger); // Logger Middleware

// Init customer controller internal routes here
supportReqCnt.router.post('/addnew', supportReqCnt.postAddNewSupportReq);
supportReqCnt.router.get('/getnew', supportReqCnt.getRetreiveNewSupportReq);
supportReqCnt.router.post('/swaptable', supportReqCnt.postShiftSupportReq);
supportReqCnt.router.get('/check', supportReqCnt.getCheckReq);
supportReqCnt.router.get('/deleteallreqs', supportReqCnt.getDeleteAllReqs);
supportReqCnt.router.get('/closereq/:reqId', supportReqCnt.getCloseReq);

// Add custom controller routes here
app.use('/supportreq/', supportReqCnt.router);

// Error Handling Middleware goes here
app.use(errorHandler);

app.listen(endpoints[svc].http_port, () => {
  console.log(`App listening on port ${endpoints[svc].http_port}`);
});

module.exports = {
  app,
};
