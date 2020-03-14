import { Response, Request, NextFunction, Router } from 'express';
import axios, { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { endpoints } from 'common-util/configs';
import { SupportReq } from '../models/SupportReq';

// Init router here
export const router = Router();

export const postSupportReq = (req: Request, res: Response,
  next: NextFunction): void => {
  const suppReq: SupportReq = req.body.support_req;
  if (!_checkSupportRequest(suppReq)) {
    next({ msg: 'Invalid Fields' });
    return;
  }
  suppReq.reqId = uuidv4();
  suppReq.reqTime = new Date();
  _retrieveGuestEmails()
    .then((emails: string[]) => {
      if (!_checkUniqueEmail(suppReq.email, emails)) {
        throw new Error('Email not unique');
      }
    })
    .then(() => _addNewSupportReqDb(suppReq))
    .then((rs: AxiosResponse) => {
      if (rs.status !== 200) throw new Error();
      res.status(200).json({ success: true });
    })
    .catch((err: Error) => next({ err, msg: 'Adding support req failed' }));
};

const _retrieveGuestEmails = (): Promise<string[]> => {
  console.log('replace me');
  return Promise.resolve([]);
};

const _checkUniqueEmail = (email: string, email_list: string[]): boolean => {
  for (let i = 0; i < email_list.length; i += 1) {
    if (email === email_list[i]) {
      console.log('This email has been registered');
      return false;
    }
  }
  return true;
};

const _addNewSupportReqDb = (suppReq: SupportReq): Promise<AxiosResponse> => {
  const apiUrl = `${endpoints.db.full_url}/supportreq/addnew`;
  return axios.post(apiUrl, { support_req: suppReq });
};

const _checkSupportRequest = (suppReq: SupportReq): boolean => {
  const required = ['name', 'email', 'category', 'browserId'];
  let valid = true;
  required.forEach((field: string) => {
    if (suppReq[field as keyof SupportReq] === undefined) {
      valid = false;
    }
  });
  return valid;
};
