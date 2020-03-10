import { cfg } from 'f10-util/configs';
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

const db = {
  database: cfg.db_details.database,
  connectionLimit: cfg.db_details.conn_count,
  ..._getDBCreds(),
};

const _connectToDB = (): Pool => {
  const pool: Pool = mysql.createPool({
    ...db,
  });
  return pool;
};

export const pool: Pool = _connectToDB();
