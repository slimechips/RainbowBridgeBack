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

const checkUniqueEmail = (email: string, email_list: string[]): boolean => {
  for (let i = 0; i < email_list.length; i++) { // eslint-disable-line
    if (email === email_list[i]) {
      console.log('This email has been registered');
      return false;
    }
  }
  return true;
};

export const hello = 'l';
