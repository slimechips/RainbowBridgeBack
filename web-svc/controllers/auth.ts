import { Response, Request, NextFunction, Router } from 'express'; // eslint-disable-line
import axios from 'common-util/axios';
import { cfg } from 'common-util/configs';
import { AxiosResponse, AxiosError } from 'axios';
import crypto from 'crypto';

// Init router here
export const router = Router();

export const getToken = (req: Request, res: Response,
  next: NextFunction): void => {
  _getToken()
    .then(() => {
      res.status(200).json({});
    })
    .catch((err: Error) => next({ err }));
};

export const getValidateToken = (req: Request, res: Response,
  next: NextFunction): void => {
  _validateToken()
    .then(() => {
      res.status(200).json({
        status: 'OK',
      });
    })
    .catch((err: Error) => next({ err }));
};

/**
 * Called on application alive
 * Authenticates this server with Rainbow API server and sets request headers
 */
const _getToken = (): Promise<void> => new Promise((resolve, reject): void => {
  _authenticateApp()
    .then(_extractToken)
    .then(_setTokenToHeader)
    .then(() => resolve())
    .catch((err: Error) => {
      const aErr: AxiosError = err as AxiosError;
      if (aErr.response !== undefined) {
        console.log(aErr.response.data);
      }
      reject(err);
    });
});

/**
 * Authenticate app and request a token from Rainbow API server
 */
const _authenticateApp = (): Promise<AxiosResponse> => {
  const apiUrl = `${cfg.rainbow.scheme}${cfg.rainbow.base_url}:`
    + `${cfg.rainbow.port}${cfg.rainbow.endpoints.login}`;
  const auth = Buffer.from(`${cfg.rainbow.email}:${cfg.rainbow.password}`)
    .toString('base64');
  const secretPw = `${cfg.rainbow.app_secret_key}${cfg.rainbow.password}`;
  const appAuthT = `${cfg.rainbow.app_id}:${crypto.createHash('sha256')
    .update(secretPw).digest('hex')}`;
  const appAuth = Buffer.from(appAuthT).toString('base64');
  const headers = {
    Accept: 'application/json',
    Authorization: `Basic ${auth}`,
    'x-rainbow-app-auth': `Basic ${appAuth}`,
  };
  return axios.get(apiUrl, { headers });
};

/**
 * Extracts the value of the token from Rainbow API
 * @param data The response from the Rainbow API Server
 * @return {string} token to be used for API calls
 */
const _extractToken = (data: AxiosResponse): string => {
  interface LoginResponse {
    loggedInApplication: object;
    loggedInUser: object;
    token: string;
  }

  const body: LoginResponse = data.data;
  return body.token;
};

/**
 * Sets the bearer token for future requests through axios
 * @param token Token to set
 */
const _setTokenToHeader = (token: string): void => {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; // eslint-disable-line
  console.info(`Set token as: ${token}`);
};

/**
 * Validate the current token used for API calls to Rainbow Server
 */
const _validateToken = (): Promise<AxiosResponse> => {
  const apiUrl = `${cfg.rainbow.scheme}${cfg.rainbow.base_url}:`
    + `${cfg.rainbow.port}${cfg.rainbow.endpoints.auth_validate}`;
  return axios.get(apiUrl);
};

_getToken();
