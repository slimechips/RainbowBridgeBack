import { Request, Response, NextFunction, Router } from 'express';
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
  const table: string = cfg.dbs.support_req_db.tables.new_reqs.name;
  _retreiveSuppReqs(table, null, null)
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
  _deleteReqFromTable(suppReq.reqId, fromTable)
    .then(() => {
      _addSupportReq(suppReq, toTable);
    })
    .then(() => res.status(200).json({ success: true }))
    .catch((err: Error) => {
      // TODO: Add req back if failed to add to table
      next({ err, msg: err.stack });
    });
};

export const getCheckReq = (req: Request, res: Response,
  next: NextFunction): void => {
  const { agentId, reqId, email }: {
    agentId: string | undefined;
    reqId: string | undefined;
    email: string | undefined;
  } = req.query;
  const table = cfg.dbs.support_req_db.tables.scheduled_reqs.name;
  const [cond, val] = _getCondAndVal(agentId, reqId, email);
  _retreiveSuppReqs(table, cond, val)
    .then((suppReqs: SupportReq[]) => {
      const suppReq: SupportReq = suppReqs[0];
      res.status(200).json({ suppReq });
    })
    .catch((err: Error) => next({ err }));
};

export const getDeleteAllReqs = (req: Request, res: Response,
  next: NextFunction): void => {
  const { neww, scheduled }: { neww: string; scheduled: string } = req.query;
  const newB = neww === 'true';
  const schB = scheduled === 'true';

  Promise.resolve()
    .then(() => {
      const newDb: string = cfg.dbs.support_req_db.tables.new_reqs.name;
      if (newB) {
        return _deleteReqFromTable(null, newDb).catch(() => {});
      }
      console.log('Not deleting new reqs');
      return Promise.resolve();
    })
    .then(() => {
      const schDb: string = cfg.dbs.support_req_db.tables.scheduled_reqs.name;
      if (schB) return _deleteReqFromTable(null, schDb).catch(() => {});
      console.log('Not deleting scheduled reqs');
      return Promise.resolve();
    })
    .then(() => {
      res.status(200).json({ success: true });
    })
    .catch((err: Error) => next({ err, msg: err.message }));
};

export const getCloseReq = (req: Request, res: Response,
  next: NextFunction): void => {
  const { reqId } = req.params;
  const schTable: string = cfg.dbs.support_req_db.tables.scheduled_reqs.name;
  const compTable: string = cfg.dbs.support_req_db.tables.completed_reqs.name;
  let suppReq: SupportReq;
  _retreiveSuppReqs(schTable, 'req_id', reqId)
    .then((suppReqs: SupportReq[]) => {
      [suppReq] = suppReqs;
      return _deleteReqFromTable(reqId, schTable);
    })
    .then(() => _addSupportReq(suppReq, compTable))
    .then(() => {
      res.status(200).json({ success: true });
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

const _getCondAndVal = (agentId: string | undefined, reqId: string | undefined,
  email: string | undefined): string[] => {
  if (agentId !== undefined) return ['agent_id', agentId];
  if (reqId !== undefined) return ['req_id', reqId];
  if (email !== undefined) return ['email', email];
  return ['', ''];
};

/**
 * Converts a support request from object to SQL string
 * @param suppReq Support request object
 * @param table Table to insert into
 * @returns {string} SQL command to be executed
 */
const _supportReqToSQL = (suppReq: SupportReq,
  table: string): string => {
  const { cols } = cfg.dbs.support_req_db.tables.new_reqs;
  let commandA = `INSERT INTO ${table} `
    + `(${cols.reqId}, ${cols.name}, ${cols.email}`
    + `, ${cols.category}, ${cols.reqTime}, ${cols.browserId}, ${cols.guestId}`;

  let commandB = ` VALUES ('${suppReq.reqId}', '${suppReq.name}'`
    + `, '${suppReq.email}', '${suppReq.category}'`
    + `, '${suppReq.reqTime}', '${suppReq.browserId}', '${suppReq.guestId}'`;
  if (suppReq.agentId !== undefined && suppReq.agentName !== undefined) {
    commandA += `, ${cols.agentId}, ${cols.agentName}`;
    commandB += `, '${suppReq.agentId}', '${suppReq.agentName}'`;
  }
  commandA += ')';
  commandB += ')';
  return commandA + commandB;
};

const _retreiveSuppReqs = (table: string, cond: string | null,
  val: string | null): Promise<SupportReq[]> => {
  const where = cond === null ? '' : ` WHERE ${cond} = '${val}'`;
  const sqlCommand = `SELECT * FROM ${table}${where}`;
  console.info(`_retrieveSuppReqs: sqlCommand=${sqlCommand}`);

  return new Promise((resolve, reject): void => {
    supportReqPool.query(sqlCommand, (err: Error, rs: object[]) => {
      if (err) {
        reject(err);
        return;
      }
      arrPrintMySQLRes(rs);
      if (rs.length < 1) {
        reject(new Error('No support request found'));
        return;
      }
      resolve(_sqlSupportReqConversion(rs));
    });
  });
};

const _sqlSupportReqConversion = (suppReqsObj: object[]): SupportReq[] => {
  const { cols } = cfg.dbs.support_req_db.tables.scheduled_reqs;
  const result: SupportReq[] = [];
  suppReqsObj.forEach((obj: any) => { // eslint-disable-line
    result.push({
      name: obj[cols.name],
      email: obj[cols.email],
      category: obj[cols.category],
      reqTime: obj[cols.reqTime],
      reqId: obj[cols.reqId],
      browserId: obj[cols.browserId],
      agentId: obj[cols.agentId],
      agentName: obj[cols.agentName],
      guestId: obj[cols.guestId],
    });
  });
  return result;
};

const _deleteReqFromTable = (suppReqId: string | null,
  table: string): Promise<void> => {
  const where = suppReqId === null ? '' : ` WHERE req_id = '${suppReqId}'`;
  const sqlCommand = `DELETE FROM ${table}${where}`;
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
