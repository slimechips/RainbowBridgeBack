import { Response, Request, NextFunction, Router } from 'express'; // eslint-disable-line
import { cfg } from 'f10-util/configs';
import { getGenericData, destructureSQL } from './common';
import { FFData } from '../models/FFData';

// Init router here
export const router = Router();

export const getPassword = (req: Request, res: Response,
  next: NextFunction): void => {
  const cond = `username = '${req.params.username}' LIMIT 1`;
  _getFFData('password', cond).then((rs: FFData) => {
    const json: object = {
      username: req.params.username,
      password: rs.password,
    };
    res.status(200).send(json);
  }).catch((err) => next({ err }));
};

/**
 * Get customers of user, returns object with
 * username, customers
 * @param req Req
 * @param res Res
 * @param next Next
 */
export const getCustomers = (req: Request, res: Response,
  next: NextFunction): void => {
  let { username } = req.params;
  username = decodeURIComponent(username);
  const cond = `username = '${username}' LIMIT 1`;
  _getFFData('customers', cond).then((rs: FFData) => {
    const customerArray: Array<string> = destructureSQL(rs.customers);
    const json: object = { username, customers: customerArray };
    res.status(200).send(json);
  }).catch((err) => next({ err }));
};

/**
 * Get data about a user
 * @param fieldsParam Fields to get info about
 * @param cond Which condition(user) to get from
 */
const _getFFData = (fieldsParam: string,
  cond: string): Promise<FFData> => getGenericData('User',
    cfg.db_details.usr_dir_table, fieldsParam, cond) as Promise<FFData>;
