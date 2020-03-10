import { Response, Request, NextFunction, Router } from 'express';
import { SupportReq } from '../models/SupportReq';

// Init router here
export const router = Router();

export const postSupportReq = (req: Request, res: Response,
  next: NextFunction): void => {

  const { suppReq }: { suppReq: SupportReq } = req.body;
  
  res.status(200).json({ hello: 'worldlllll' });
};

const retrieveGuestEmails = (): string[] => {
  
  return 
}

export const hello = 'l';
