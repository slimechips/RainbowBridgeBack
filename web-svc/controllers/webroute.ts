import { Response, Request, NextFunction, Router } from 'express';
import axios from 'common-util/axios';
import { AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { endpoints, cfg } from 'common-util/configs';
import { SupportReq } from '../models/SupportReq';

// Init router here
export const router = Router();

export const postSupportReq = (req: Request, res: Response,
  next: NextFunction): void => {
  const suppReq: SupportReq = req.body.support_req;
  if (!suppReq || !suppReq.name || !suppReq.email || !suppReq.browserId) {
    const err: Error = new Error('Missing Parameters');
    next({ err, msg: err.message });
    return;
  }

  if (!_testEmail) {
    const err: Error = new Error('Invailid Email');
    next({ err, msg: err.message });
    return;
  }

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
    .then(() => _createGuest(suppReq))
    .catch((err: Error) => {
      throw err;
    })
    .then((guestId: string) => {
      suppReq.guestId = guestId;
      _addNewSupportReqDb(suppReq);
    })
    .then(() => _reqAgent(suppReq))
    .then((rs: AxiosResponse) => {
      if (rs.status !== 200) throw new Error();
      const retSuppReq: SupportReq = rs.data.suppReq;
      const msg = `User ${retSuppReq.name} with id ${retSuppReq.guestId}`
        + `to connect with agent ${retSuppReq.agentName} with agentId`
        + `${retSuppReq.agentId}`;
      console.log(msg);
      res.status(200).json({ support_req: retSuppReq });
    })
    .catch((err: Error) => {
      next({ err, msg: err.message });
    });
};

const _testEmail = (email: string): boolean => {
  const regExp = /^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/i;
  return regExp.test(email);
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

const _reqAgent = (suppReq: SupportReq): Promise<AxiosResponse> => {
  const apiUrl = `${endpoints.call.full_url}/scheduler/reqagent`;
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

const _createGuest = (suppReq: SupportReq): Promise<string> => {
  const apiUrl = `${cfg.rainbow.scheme}${cfg.rainbow.base_url}:`
  + `${cfg.rainbow.port}${cfg.rainbow.endpoints.create_user}`;
  const body = {
    firstName: suppReq.name,
    loginEmail: suppReq.email,
    roles: ['guest'],
    password: 'Rainbow1!', // Hardcode for now
    userInfo1: suppReq.reqId, // Req_id here
    userInfo2: suppReq.browserId, // Browser_id here
  };
  return axios.post(apiUrl, body)
    .then((rs: AxiosResponse) => rs.data.data.id)
    .catch((err: AxiosError) => {
      if (!err.response) throw err;
      console.error(err.response.statusText);
      throw new Error('Failed to create guest. Possibly invalid email.');
    });
};
