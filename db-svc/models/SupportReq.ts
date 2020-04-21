import { Category } from './Category';
import { ReqStatus } from './ReqStatus';

export interface SupportReq {
  name: string;
  email: string;
  category: string;
  reqTime: Date;
  reqId: string;
  browserId: string;
  guestId?: string;
  agentId?: string;
  agentName?: string;
}
