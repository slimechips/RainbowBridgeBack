import { Response, Request, NextFunction, Router } from 'express';
import axios from 'common-util/axios';
import { cfg, endpoints } from 'common-util/configs';
import { AxiosResponse, AxiosError } from 'axios';
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
      [suppReq.agentId, suppReq.agentName] = arr;
      res.status(200).json({ suppReq });
    })
    .catch((err: Error) => {
      if (!scheduling) {
        _scheduleQueue();
      } else {
        again = true;
      }
      next({ err, msg: err.message });
    });
};

export const getDeleteReqs = (req: Request, res: Response): void => {
  deleteReqs(true, true);
  res.status(200).json({});
};

export const getUntagAgent = (req: Request, res: Response,
  next: NextFunction): void => {
  const { agentId } = req.params;
  _getAgents(null)
    .then((users: User[]) => {
      if (users.length === 0) {
        throw new Error('Failed to find agent to untag');
      }
      return _extractAgentById(users, agentId);
    })
    .then((user: User | null) => {
      if (user === null) throw new Error('Failed to find agent with the id');
      return _unTagAgent(user);
    })
    .then(() => {
      res.status(200).json({ success: true });
    })
    .catch((err: Error) => next({ err }));
};

export const deleteReqs = (neww: boolean, scheduled: boolean): void => {
  const apiUrl = `${endpoints.db.full_url}/supportreq/deleteallreqs`;
  axios.get(apiUrl, {
    params: { neww, scheduled },
  })
    .catch((err: AxiosError) => {
      if (err.response === undefined
         || err.response.data.error !== 'Cannot delete req') {
        throw new Error('Db request to delete failed');
      }
    })
    .then(() => {
      console.log('Tables Cleared');
      return _getAgents(null);
    })
    .then((users: User[]) => _unTagAgents(users, 0))
    .then(() => console.log('Agents set free'))
    .catch(() => console.error('Failed to clear tables'));
};

const _unTagAgents = (users: User[], current: number): Promise<void> => {
  const user = users[current];
  const timeoutLength = 100000;
  let cancelled = false;
  const timeout = setTimeout(() => {
    cancelled = true;
    return Promise.reject(new Error('Internet Error'));
  }, timeoutLength);
  return new Promise((resolve, reject): void => {
    _unTagAgent(user)
      .then(() => {
        console.log('Untag of agent Successful');
      })
      .catch((err: Error) => {
        console.error(err);
        console.error('Untag of agent Unsuccessful');
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeout);
        }
        if (current + 1 === users.length) {
          resolve();
          return;
        }
        _unTagAgents(users, current + 1)
          .then(() => resolve())
          .catch(reject);
      });
  });
};

const _unTagAgent = (user: User): Promise<AxiosResponse> => {
  const apiUrl = `${cfg.rainbow.scheme}${cfg.rainbow.base_url}:`
  + `${cfg.rainbow.port}${cfg.rainbow.endpoints.update_user}/${user.id}`;
  const index = user.tags.indexOf('busy');
  if (index > -1) user.tags.splice(index, 1);
  return axios.put(apiUrl, { tags: user.tags });
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
  let agentName: string;
  let tags: string[];
  let errorThrown = false;
  _getAgents(suppReq)
    .then((users: User[]) => {
      const user: User = _extractAvailAgent(users);
      availAgent = user.id;
      agentName = user.displayName;
      tags = user.tags;
    })
    .catch(() => {
      errorThrown = true;
      throw new Error('No available agents');
    })
    .then(() => _shiftSuppReqTable(
      cfg.support_req_tables.new,
      cfg.support_req_tables.scheduled,
      suppReq,
      availAgent,
      agentName,
    ))
    .catch((err: Error) => {
      if (errorThrown) throw err;
      errorThrown = true;
      throw new Error('Cannot shift support request between tables 1');
    })
    .then(() => _tagAgent(availAgent, tags))
    .then(() => resolve([availAgent, agentName]))
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
  agentId: string, agentName: string): Promise<void> => {
  const apiUrl = `${endpoints.db.full_url}/supportreq/swaptable`;
  const newSuppReq = suppReq;
  newSuppReq.agentId = agentId;
  newSuppReq.agentName = agentName;
  newSuppReq.guestId = suppReq.guestId;
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

const _getAgents = (suppReq: SupportReq | null): Promise<User[]> => {
  const apiUrl = `${cfg.rainbow.scheme}${cfg.rainbow.base_url}:`
  + `${cfg.rainbow.port}${cfg.rainbow.endpoints.get_users}`;
  const params = {
    companyId: cfg.rainbow.company_id,
    roles: 'user',
    format: 'full',
    tags: suppReq === null ? undefined : suppReq.category,
  };

  return axios.get(apiUrl, {
    params,
  }).then((rs: AxiosResponse) => rs.data.data);
};

const _extractAvailAgent = (users: User[]): User => {
  const aUsers: User[] = [];
  users.forEach((user: User) => {
    if (!user.tags.includes(cfg.rainbow.tags.busy)) aUsers.push(user);
  });
  if (aUsers.length === 0) {
    throw new Error('No available agents');
  }
  return aUsers[0];
};

const _extractAgentById = (users: User[], id: string): User | null => {
  let result: User | null = null;
  users.forEach((user: User) => {
    if (user.id === id) result = user;
  });
  return result;
};
