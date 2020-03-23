import { Response, Request, NextFunction, Router } from 'express';
import axios from 'common-util/axios';
import { cfg } from 'common-util/configs';
import { AxiosResponse, AxiosError } from 'axios';
import { SupportReq } from '../models/SupportReq';

export const router: Router = Router();

export const postReqAgent = (req: Request, res: Response,
  next: NextFunction): void => {
  const { support_req: suppReq }: { support_req: SupportReq } = req.body;
  _checkAvailAgents()
    .then(() => _createGuest(suppReq))
    .then(() => res.status(200).json({}))
    .catch((err: AxiosError) => {
      if (err.response !== undefined) {
        console.log(err.response.data);
      }
      next({ err });
    });
};

const _checkAvailAgents = (): Promise<void> => {
  console.log('Replace me');
  return Promise.resolve();
};

const _createGuest = (suppReq: SupportReq): Promise<AxiosResponse> => {
  const apiUrl = `${cfg.rainbow.scheme}${cfg.rainbow.base_url}:`
  + `${cfg.rainbow.port}${cfg.rainbow.endpoints.create_user}`;
  const body = {
    firstName: suppReq.name,
    loginEmail: suppReq.email,
    roles: ['guest'],
    userInfo1: suppReq.reqId, // Req_id here
    userInfo2: suppReq.browserId, // Browser_id here
  };
  return axios.post(apiUrl, body);
};
