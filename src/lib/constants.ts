export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  ADMIN: 'admin',
  CASHIER: 'cashier',
  WAITER: 'waiter',
  STOREKEEPER: 'storekeeper',
  ACCOUNTANT: 'accountant',
  AUDITOR: 'auditor',
} as const;
export const BRANCH_ID = 'chebunyo_main';
export const BUSINESS_NAME = 'CLUB MARINA';
export const BUSINESS_LOCATION = 'Chebunyo, Bomet, Kenya';
export const PAYMENT_METHODS = ['Cash','M-Pesa Till','M-Pesa Paybill'] as const;
export const TABLE_STATUSES = ['Available','Occupied','Reserved','Payment Pending','Cleaning','Closed'] as const;
export const ORDER_STATUSES = ['Draft','Submitted','Preparing','Ready','Served','Payment Pending','Completed','Voided','Cancelled'] as const;