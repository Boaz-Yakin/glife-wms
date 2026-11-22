export type OperatorRole = 'OPERATOR' | 'ADMIN';

export interface WarehouseOperator {
  id: string;
  name: string;
  pin_code: string;
  role: OperatorRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOperatorInput {
  name: string;
  pin_code: string;
  role?: OperatorRole;
}
