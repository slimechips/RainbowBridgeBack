import express from 'express';
import bodyParser from 'body-parser';

const svc = 'db';
process.env.SVC = `${svc}-svc`;
import { endpoints } from 'common-util/configs';
import { reqLogger } from 'common-util/logger';
import { errorHandler } from 'common-util/error';

// Controllers
import * as userController from './controllers/user';
import * as custController from './controllers/customer';

const app: express.Application = express();

// Engine Setup
app.use(bodyParser.urlencoded({ extended: true })); // Body Parser Middle Ware
app.use(bodyParser.json()); // Body Parser Middle Ware
app.use(reqLogger); // Logger Middleware

// Init user controller internal routes here
userController.router.get('/:username/password', userController.getPassword);
userController.router.get('/:username/customers/get', userController.getCustomers);

// Init customer controller internal routes here
custController.router.post('/:customer/details/edit', custController.postEditDetails);
custController.router.get('/:customers/getdetails', custController.getCustomerDetails);
custController.router.get('/:customers/getcurnews', custController.getNews);
custController.router.post('/:customer/setnews', custController.postNews);
custController.router.get('/:id/password', custController.getPassword);
custController.router.post('/:customer/upload/add', custController.postAddReqUpload);
custController.router.get('/:cusomter/upload/get', custController.getReqUpload);

// Add custom controller routes here
app.use('/user', userController.router);
app.use('/customer', custController.router);

// Error Handling Middleware goes here
app.use(errorHandler);

app.listen(endpoints[svc].http_port, () => {
  console.log(`App listening on port ${endpoints[svc].http_port}`);
});

module.exports = {
  app,
};
