import { Category } from './Category';
import { ReqStatus } from './ReqStatus';

export interface SupportReq {
  name: string;
  email: string;
  category: Category;
  reqTime: Date;
  reqId: string;
  browserId: string;
  status: ReqStatus;
  guestId?: string;
  agentId?: string;
  agentName?: string;
}
