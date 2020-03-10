import { Response, Request, Router } from 'express';

// Init router here
export const router = Router();

export const getLogin = (req: Request, res: Response) => {
  res.status(200).json({ hello: 'worldlllll' });
};

export const hello = 'l';
