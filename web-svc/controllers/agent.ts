import { Response, Request, NextFunction, Router } from 'express';
import axios from 'common-util/axios';
import { AxiosResponse } from 'axios';
import { endpoints } from 'common-util/configs';
import { SupportReq } from '../models/SupportReq';

// Init router here
export const router = Router();

export const getCheckForRequest = (req: Request, res: Response,
  next: NextFunction): void => {
  const { agentId } = req.params;
  checkForRequestDB(agentId)
    .then((rs: AxiosResponse) => {
      const { suppReq }: { suppReq: SupportReq } = rs.data;
      res.status(200).json({ suppReq });
    })
    .catch((err: Error) => next({ err, msg: 'No available support req' }));
};

const checkForRequestDB = (agentId: string): Promise<AxiosResponse> => {
  const apiUrl = `${endpoints.db.full_url}/supportreq/checkforreq/${agentId}`;
  return axios.get(apiUrl);
};
