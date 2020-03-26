import { Response, Request, NextFunction, Router } from 'express';
import axios from 'common-util/axios';
import { cfg, endpoints } from 'common-util/configs';
import { AxiosResponse } from 'axios';
import { SupportReq } from '../models/SupportReq';
import { User } from '../models/User';

export const router: Router = Router();

let scheduling = false;
let again = false;

export const postReqAgent = (req: Request, res: Response,
  next: NextFunction): void => {
  if (scheduling) {
    again = true;
    next({ err: new Error('Still scheduling') });
    return;
  }

  const { support_req: suppReq }: { support_req: SupportReq } = req.body;
  _reqAgent(suppReq)
    .then((arr: string[]) => {
      [suppReq.agentId, suppReq.agentName, suppReq.guestId] = arr;
      res.status(200).json({ suppReq });
    })
    .catch((err: Error) => {
      if (!scheduling) {
        _scheduleQueue();
      } else {
        again = true;
      }
      next({ err });
    });
};

/**
 * Tries to request an agent for the given support request
 * It will first obtain the list of available agents
 *  - If this fails, the function will throw an error and exit
 * It will try to pick an available agent
 *  - If this fails, the function will throw an error and exit
 * It will try to mark the request as scheduled
 *  - If this fails, the function will throw an error and exit
 * If successful, it will
 *  a. Create the guest account (for now we assume this will work)
 *  b. On the rainbow server, tag the agent as busy (also assume this works)
 * @param suppReq Support request to settle
 * @returns {string} The id of the agent requested and scheduled already
 */
const _reqAgent = (suppReq: SupportReq): Promise<string[]> => new
Promise((resolve, reject): void => {
  let availAgent: string;
  let guestId: string;
  let agentName: string;
  let tags: string[];
  let errorThrown = false;
  _checkAvailAgents(suppReq)
    .then((rs: AxiosResponse) => {
      const user: User = _extractAvailAgents(rs);
      availAgent = user.id;
      agentName = user.displayName;
      tags = user.tags;
    })
    .catch(() => {
      errorThrown = true;
      throw new Error('No available agents');
    })
    .then(() => _createGuest(suppReq))
    .then((rs: AxiosResponse) => {
      guestId = rs.data.data.id;
    })
    .catch((err: Error) => {
      if (errorThrown) throw err;
      errorThrown = true;
      throw new Error('Cannot create guest accounts');
    })
    .then(() => _shiftSuppReqTable(
      cfg.support_req_tables.new,
      cfg.support_req_tables.scheduled,
      suppReq,
      availAgent,
      agentName,
      guestId,
    ))
    .catch((err: Error) => {
      if (errorThrown) throw err;
      errorThrown = true;
      throw new Error('Cannot shift support request between tables 1');
    })
    .then(() => _tagAgent(availAgent, tags))
    .then(() => resolve([availAgent, agentName, guestId]))
    .catch((err: Error) => {
      reject(err);
    });
});

/**
 * This function will try to schedule all support reqs with an agent
 * This function is invoked either
 *  a. Some time delay after web-svc api call fails to create an agent
 *  b. The previous call to scheduleQueue does not resolve all support reqs
 *  c. Web-svc invoked postReqAgent API Call during previous scheduleQueue
 * If it succeeds, notify web svc
 * If it fails, notify web svc of changed reqs, calls itself again after a delay
 */
const _scheduleQueue = (): void => {
  scheduling = true;
  again = false;
  let reqNum: number;
  _retrieveSuppReqsDB()
    .then(_retrieveSuppReqs)
    .then((suppReqs: SupportReq[]) => {
      reqNum = suppReqs.length;
      return _tryQueue(suppReqs, 0);
    })
    .then((arr: string[][]) => {
      if (arr.length !== reqNum) throw new Error('Still more requests');
    })
    .then(() => {
      if (again) throw new Error('Extra support requests to handle still...');
      scheduling = false;
    })
    .catch(() => {
      setTimeout(() => {
        _scheduleQueue();
      }, cfg.schedule_delay);
      console.log('Rescheduling...');
    });
};

/**
 * Try to clear the queue
 * This is a recursive call that will queue whatever requests are given
 * Any requests that cannot be queued will throw an promise reject
 * @param suppReqs Support Requests to queue
 * @param current Current support request to serve
 * @return {string[]} The accumulated ids of agents to be connected
 */
const _tryQueue = (suppReqs: SupportReq[], current: number):
Promise<string[][]> => {
  const suppReq = suppReqs[current];
  const timeoutLength = 100000;
  let cancelled = false;
  const timeout = setTimeout(() => {
    cancelled = true;
    return Promise.reject(new Error('Internet Error'));
  }, timeoutLength);
  return new Promise((resolve, reject): void => {
    _reqAgent(suppReq)
      .then((arr: string[]) => {
        const [availAgent, agentName, guestId] = arr;
        if (!cancelled) {
          clearTimeout(timeout);
          if (current + 1 === suppReqs.length) {
            resolve([[availAgent, agentName, guestId]]);
            return;
          }
          _tryQueue(suppReqs, current + 1)
            .then((availAgents: string[][]) => {
              availAgents.push([availAgent, agentName, guestId]);
              resolve(availAgents);
            })
            .catch(reject);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          clearTimeout(timeout);
          reject(err);
        }
      });
  });
};

const _shiftSuppReqTable = (from: string, to: string, suppReq: SupportReq,
  agentId: string, agentName: string, guestId: string): Promise<void> => {
  const apiUrl = `${endpoints.db.full_url}/supportreq/swaptable`;
  const newSuppReq = suppReq;
  newSuppReq.agentId = agentId;
  newSuppReq.agentName = agentName;
  newSuppReq.guestId = guestId;
  return axios.post(apiUrl, { suppReq: newSuppReq, from, to });
};

const _tagAgent = (agentId: string, tags: string[]): Promise<AxiosResponse> => {
  const apiUrl = `${cfg.rainbow.scheme}${cfg.rainbow.base_url}:`
  + `${cfg.rainbow.port}${cfg.rainbow.endpoints.update_user}/${agentId}`;
  tags.push('busy');
  return axios.put(apiUrl, { tags });
};

const _retrieveSuppReqs = (rs: AxiosResponse):
  SupportReq[] => rs.data.data as SupportReq[];

const _retrieveSuppReqsDB = (): Promise<AxiosResponse> => {
  const apiUrl = `${endpoints.db.full_url}/supportreq/getnew`;
  return axios.get(apiUrl);
};

const _checkAvailAgents = (suppReq: SupportReq): Promise<AxiosResponse> => {
  const apiUrl = `${cfg.rainbow.scheme}${cfg.rainbow.base_url}:`
  + `${cfg.rainbow.port}${cfg.rainbow.endpoints.create_user}`;
  return axios.get(apiUrl, {
    params: {
      companyId: cfg.rainbow.company_id,
      roles: 'user',
      format: 'full',
      tags: suppReq.category,
    },
  });
};

const _extractAvailAgents = (rs: AxiosResponse): User => {
  const users: User[] = rs.data.data;
  const aUsers: User[] = [];
  users.forEach((user: User) => {
    if (!user.tags.includes(cfg.rainbow.tags.busy)) aUsers.push(user);
  });
  if (aUsers.length === 0) {
    throw new Error('No available agents');
  }
  return aUsers[0];
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
