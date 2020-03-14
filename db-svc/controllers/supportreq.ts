import { Request, Response, NextFunction, Router } from 'express';
import { cfg } from 'common-util/configs';
import { supportReqPool } from './init';
import { MySQLResponse } from '../models/MySQLResponse';
import { printMySQLRes } from './common';
import { SupportReq } from '../models/SupportReq';

export const router = Router();

export const postAddNewSupportReq = (req: Request, res: Response,
  next: NextFunction): void => {
  const supportReq: SupportReq = req.body.support_req;
  _addNewSupportReq(supportReq)
    .then(() => res.status(200).json({ success: true }))
    .catch((err: Error) => next({ err }));
};

/**
 * Add a support request to the new support request table
 * @returns {boolean} SQL command success/failure
 */
const _addNewSupportReq = (supportReq: SupportReq): Promise<boolean> => {
  const table: string = cfg.dbs.support_req_db.tables.new_reqs.name;
  const sqlCommand: string = _supportReqToSQL(supportReq, table);
  console.info(`_addSupportReq: sqlCommand=${sqlCommand}`);

  return new Promise((resolve, reject): void => {
    supportReqPool.query(sqlCommand, (err: Error, rs: MySQLResponse) => {
      if (err) return reject(err);
      printMySQLRes(rs);
      if (rs.affectedRows === 0) return reject(new Error('Cannot insert req'));
      return resolve(true);
    });
  });
};

/**
 * Converts a support request from object to SQL string
 * @param supportReq Support request object
 * @param table Table to insert into
 * @returns {string} SQL command to be executed
 */
const _supportReqToSQL = (supportReq: SupportReq,
  table: string): string => {
  const { cols } = cfg.dbs.support_req_db.tables.new_reqs;
  return `INSERT INTO ${table} `
    + `(${cols.reqId}, ${cols.name}, ${cols.email}`
    + `, ${cols.category}, ${cols.reqTime}, ${cols.browserId})`
    + ` VALUES ('${supportReq.reqId}', '${supportReq.name}'`
    + `, '${supportReq.email}', '${supportReq.category}'`
    + `, '${supportReq.reqTime}', '${supportReq.browserId}')`;
};
