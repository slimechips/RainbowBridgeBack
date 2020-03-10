import { cfg } from 'common-util/configs';
import mysql, { Pool } from 'mysql'; // eslint-disable-line

interface DBCreds {
  host: string;
  port: number;
  user: string;
  password: string;
}

const _getDBCreds = (): DBCreds => {
  const dbCreds: DBCreds = {
    host: cfg.db_details.host,
    port: cfg.db_details.port,
    user: cfg.db_details.usr,
    password: cfg.db_details.pwd,
  };
  return dbCreds;
};

const supportReqDb = {
  database: cfg.dbs.support_req_db.name,
  connectionLimit: cfg.db_details.conn_count,
  ..._getDBCreds(),
};

const _connectToDB = (): Pool => {
  const pool: Pool = mysql.createPool({
    ...supportReqDb,
  });
  return pool;
};

export const pool: Pool = _connectToDB();
