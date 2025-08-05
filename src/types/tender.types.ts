export type TenderStatus = 'draft' | 'active' | 'closed';
export type UserRole = 'admin' | 'engineer' | 'viewer';
export type TenderRole = 'admin' | 'engineer' | 'viewer';

export interface Tender {
  id: string;
  name: string;
  description?: string;
  status: TenderStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TenderUser {
  tender_id: string;
  user_id: string;
  tender_role: TenderRole;
  created_at: string;
}

export interface TenderWithAccess extends Tender {
  user_role: TenderRole;
  created_by_name?: string;
}