import { Response, Request, NextFunction, Router } from 'express';
import axios from 'common-util/axios';
import { AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { endpoints, cfg } from 'common-util/configs';
import { SupportReq } from '../models/SupportReq';
import { User } from '../models/User';

// Init router here
export const router = Router();

export const postUpdateAvail = (req: Request, res: Response,
  next: NextFunction): void => {
  const { agentId, avail }: { agentId: string; avail: boolean } = req.body;
  if (!agentId) {
    const err: Error = new Error('Invalid parameters');
    next({ err, msg: err.message });
    return;
  }
  _getAgents(null)
    .then((users: User[]) => {
      if (users.length === 0) {
        throw new Error('Failed to find agent');
      }
      return _extractAgentById(users, agentId);
    })
    .then((user: User | null) => {
      if (user === null) throw new Error('Failed to find agent wiith the id');
      return retagAgent(agentId, user.tags, avail);
    })
    .then(() => {
      res.status(200).json({ success: true });
    })
    .catch((err: Error) => next({ err }));
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

const _extractAgentById = (users: User[], id: string): User | null => {
  let result: User | null = null;
  users.forEach((user: User) => {
    if (user.id === id) result = user;
  });
  return result;
};

const retagAgent = (agentId: string, tags: string[],
  avail: boolean): Promise<AxiosResponse> => {
  const apiUrl = `${cfg.rainbow.scheme}${cfg.rainbow.base_url}:`
  + `${cfg.rainbow.port}${cfg.rainbow.endpoints.update_user}/${agentId}`;
  if (avail && tags.includes('busy')) {
    tags.splice(tags.indexOf('busy'));
  } else if (!avail && !tags.includes('busy')) {
    tags.push('busy');
  }
  return axios.put(apiUrl, { tags });
};
