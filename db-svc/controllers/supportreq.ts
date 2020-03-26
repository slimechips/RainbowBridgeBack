import { Request, Response, NextFunction, Router, response } from 'express';
import { cfg } from 'common-util/configs';
import { supportReqPool } from './init';
import { MySQLResponse } from '../models/MySQLResponse';
import { printMySQLRes, arrPrintMySQLRes } from './common';
import { SupportReq } from '../models/SupportReq';

export const router = Router();

export const postAddNewSupportReq = (req: Request, res: Response,
  next: NextFunction): void => {
  const supportReq: SupportReq = req.body.support_req;
  const table: string = cfg.dbs.support_req_db.tables.new_reqs.name;
  _addSupportReq(supportReq, table)
    .then(() => res.status(200).json({ success: true }))
    .catch((err: Error) => next({ err }));
};

export const getRetreiveNewSupportReq = (req: Request, res: Response,
  next: NextFunction): void => {
  _retreiveSuppReqs()
    .then((suppReqs: SupportReq[]) => res.status(200).json({ data: suppReqs }))
    .catch((err: Error) => next({ err }));
};

export const postShiftSupportReq = (req: Request, res: Response,
  next: NextFunction): void => {
  const { suppReq, to, from }: {
    suppReq: SupportReq;
    to: string;
    from: string;
  } = req.body;
  const fromTable = cfg.dbs.support_req_db.tables[from].name;
  const toTable = cfg.dbs.support_req_db.tables[to].name;
  _deleteReqFromTable(suppReq, fromTable)
    .then(() => {
      _addSupportReq(suppReq, toTable);
    })
    .then(() => res.status(200).json({ success: true }))
    .catch((err: Error) => {
      // TODO: Add req back if failed to add to table
      next({ err });
    });
};

export const getCheckForSupportReq = (req: Request, res: Response,
  next: NextFunction): void => {
  const { agentId } = req.params;
  _retrieveScheduledReq(agentId)
    .then((suppReq: SupportReq) => {
      res.status(200).json({ suppReq });
    })
    .catch((err: Error) => next({ err }));
};

/**
 * Add a support request to the specified request table
 * @returns {boolean} SQL command success/failure
 */
const _addSupportReq = (supportReq: SupportReq,
  table: string): Promise<boolean> => {
  const sqlCommand: string = _supportReqToSQL(supportReq, table);
  console.info(`_addSupportReq: sqlCommand=${sqlCommand}`);

  return new Promise((resolve, reject): void => {
    supportReqPool.query(sqlCommand, (err: Error, rs: MySQLResponse) => {
      if (err) {
        reject(err);
        return;
      }
      printMySQLRes(rs);
      if (rs.affectedRows === 0) {
        reject(new Error('Cannot insert req'));
        return;
      }
      resolve(true);
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
  let commandA = `INSERT INTO ${table} `
    + `(${cols.reqId}, ${cols.name}, ${cols.email}`
    + `, ${cols.category}, ${cols.reqTime}, ${cols.browserId}`;

  let commandB = ` VALUES ('${supportReq.reqId}', '${supportReq.name}'`
    + `, '${supportReq.email}', '${supportReq.category}'`
    + `, '${supportReq.reqTime}', '${supportReq.browserId}'`;
  if (supportReq.agentId !== undefined && supportReq.agentName !== undefined
  && supportReq.guestId !== undefined) {
    commandA += `, ${cols.agentId}, ${cols.agentName}, ${cols.guestId}`;
    commandB += `, '${supportReq.agentId}', '${supportReq.agentName}'`
      + `, '${supportReq.guestId}'`;
  }
  commandA += ')';
  commandB += ')';
  return commandA + commandB;
};

const _retreiveSuppReqs = (): Promise<SupportReq[]> => {
  const table: string = cfg.dbs.support_req_db.tables.new_reqs.name;
  const sqlCommand = `SELECT * FROM ${table}`;
  console.info(`_retrieveSuppReq: sqlCommand=${sqlCommand}`);

  return new Promise((resolve, reject): void => {
    supportReqPool.query(sqlCommand, (err: Error, rs: SupportReq[]) => {
      if (err) {
        reject(err);
        return;
      }
      arrPrintMySQLRes(rs);
      resolve(rs);
    });
  });
};

const _deleteReqFromTable = (suppReq: SupportReq,
  table: string): Promise<void> => {
  const sqlCommand = `DELETE FROM ${table} WHERE req_id = '${suppReq.reqId}'`;
  console.info(`_deleteReqFromTable: sqlCommand=${sqlCommand}`);
  return new Promise((resolve, reject): void => {
    supportReqPool.query(sqlCommand, (err: Error, rs: MySQLResponse) => {
      if (err) {
        reject(err);
        return;
      }
      printMySQLRes(rs);
      if (rs.affectedRows === 0) {
        reject(new Error('Cannot delete req'));
      }
      resolve();
    });
  });
};

const _retrieveScheduledReq = (agentId: string): Promise<SupportReq> => {
  const table = cfg.dbs.support_req_db.tables.scheduled_reqs.name;
  const sqlCommand = `SELECT * FROM ${table} WHERE agent_id = '${agentId}'`;
  console.info(`_retrieveScheduledReq: sqlCommand=${sqlCommand}`);
  return new Promise((resolve, reject): void => {
    supportReqPool.query(sqlCommand, (err: Error, rs: SupportReq[]) => {
      if (err) {
        reject(err);
        return;
      }
      arrPrintMySQLRes(rs);
      if (rs.length < 1) {
        reject(new Error('No support Req Found'));
        return;
      }
      resolve(rs[0]);
    });
  });
};
