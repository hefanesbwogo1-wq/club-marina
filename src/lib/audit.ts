import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const logAudit = async (params:{
  action: string; // SALE_COMPLETED, VOID_REQUESTED, DISCOUNT_APPROVED, STOCK_ADJUSTED, PAYMENT_RECORDED, TABLE_OPENED etc
  actorEmail: string;
  actorRole: string;
  targetId?: string;
  tableName?: string;
  details: string;
  amount?: number;
  meta?: any;
}) => {
  try{
    await addDoc(collection(db,'auditLogs'),{
     ...params,
      createdAt: serverTimestamp(),
      businessDay: new Date().toDateString(),
    });
    // Also push to live activity collection (ttl 24h)
    await addDoc(collection(db,'liveActivity'),{
      text: params.details,
      action: params.action,
      actor: params.actorEmail.split('@')[0],
      amount: params.amount||0,
      tableName: params.tableName||'',
      createdAt: serverTimestamp(),
    });
  }catch(e){ console.error('audit failed', e); }
};