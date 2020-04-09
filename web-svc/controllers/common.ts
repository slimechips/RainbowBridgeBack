import { Response, Request, NextFunction, Router } from 'express';
import axios from 'common-util/axios';
import { AxiosResponse } from 'axios';
import { endpoints } from 'common-util/configs';
import { SupportReq } from '../models/SupportReq';

// Init router here
export const router = Router();

export const getCloseRequest = (req: Request, res: Response,
  next: NextFunction): void => {
  const { reqId, agentId }: { reqId: string; agentId: string } = req.query;
  _closeRequest(reqId)
    .then(() => _untagAgent(agentId))
    .then(() => {
      res.status(200).json({ success: true });
    })
    .catch((err: Error) => next({ err, msg: 'Failed to close request' }));
};

export const getCheckReqStatus = (req: Request, res: Response,
  next: NextFunction): void => {
  const { reqId, agentId, email }: {
    reqId: string | undefined;
    agentId: string | undefined;
    email: string | undefined;
  } = req.query;
  _checkReqStatus(reqId, agentId, email)
    .then((suppReq: SupportReq | null) => {
      const active = suppReq !== null;
      res.status(200).json({ support_req: suppReq, active });
    })
    .catch((err: Error) => {
      next({ err, msg: 'Failed to get req status' });
    });
};

const _closeRequest = (reqId: string): Promise<AxiosResponse> => {
  const apiUrl = `${endpoints.db.full_url}/supportreq/closereq/${reqId}`;
  return axios.get(apiUrl);
};

const _checkReqStatus = (reqId: string | undefined, agentId: string | undefined,
  email: string | undefined): Promise<SupportReq|null> => {
  const apiUrl = `${endpoints.db.full_url}/supportreq/check`;
  const [param, val] = _getCondAndVal(agentId, reqId, email);
  return axios.get(apiUrl, {
    params: {
      [param]: val,
    },
  }).then((rs: AxiosResponse) => {
    if (rs.status >= 400 || rs.data.suppReq === undefined) {
      return null;
    }
    return rs.data.suppReq;
  });
};

const _getCondAndVal = (agentId: string | undefined, reqId: string | undefined,
  email: string | undefined): string[] => {
  if (agentId !== undefined) return ['agentId', agentId];
  if (reqId !== undefined) return ['reqId', reqId];
  if (email !== undefined) return ['email', email];
  return ['', ''];
};

const _untagAgent = (agentId: string): Promise<AxiosResponse> => {
  const apiUrl = `${endpoints.call.full_url}/scheduler/untagagent/${agentId}`;
  return axios.get(apiUrl);
};
