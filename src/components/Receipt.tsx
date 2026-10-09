'use client';
import React from 'react';

type ReceiptItem = {
  name: string;
  qty: number;
  price: number;
};

type ReceiptProps = {
  order: {
    id: string;
    items: ReceiptItem[];
    subtotal: number;
    vat?: number;
    discount?: number;
    total: number;
    paymentMethod: string;
    cashier?: string;
    waiter?: string;
    table?: string;
    createdAt: any;
  };
  branch: {
    name: string;
    phone: string;
    address: string;
    pin?: string;
  };
};

const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ order, branch }, ref) => {
  const date = new Date().toLocaleString('en-KE');

  return (
    <div ref={ref} className="w-[300px] bg-white text-black p-3 text-[12px] font-mono leading-tight print:w-full">
      {/* Header */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <h1 className="text-[16px] font-bold uppercase">{branch.name}</h1>
        <p>{branch.address}</p>
        <p>Tel: {branch.phone}</p>
        {branch.pin && <p>PIN: {branch.pin}</p>}
        <p className="mt-1 font-bold">*** RECEIPT ***</p>
      </div>

      {/* Order Info */}
      <div className="mb-2 text-[11px]">
        <div className="flex justify-between"><span>Receipt #:</span><span>{order.id.slice(-6).toUpperCase()}</span></div>
        <div className="flex justify-between"><span>Date:</span><span>{date}</span></div>
        {order.table && <div className="flex justify-between"><span>Table:</span><span>{order.table}</span></div>}
        {order.waiter && <div className="flex justify-between"><span>Waiter:</span><span>{order.waiter}</span></div>}
        {order.cashier && <div className="flex justify-between"><span>Cashier:</span><span>{order.cashier}</span></div>}
      </div>

      <div className="border-b border-dashed border-black my-2"></div>

      {/* Items */}
      <div className="mb-2">
        <div className="flex justify-between font-bold border-b border-black pb-1">
          <span>ITEM</span><span>QTY x PRICE</span><span>TOTAL</span>
        </div>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between py-1">
            <span className="w-[110px] truncate">{item.name}</span>
            <span>{item.qty} x {item.price}</span>
            <span>{(item.qty * item.price).toFixed(0)}</span>
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-black my-2"></div>

      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between"><span>Subtotal</span><span>KES {order.subtotal.toFixed(2)}</span></div>
        {order.discount? <div className="flex justify-between"><span>Discount</span><span>- KES {order.discount.toFixed(2)}</span></div> : null}
        {order.vat? <div className="flex justify-between"><span>VAT (16%)</span><span>KES {order.vat.toFixed(2)}</span></div> : null}
        <div className="flex justify-between font-bold text-[14px] border-t border-black pt-1"><span>TOTAL</span><span>KES {order.total.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Paid via</span><span className="uppercase">{order.paymentMethod}</span></div>
      </div>

      <div className="border-b border-dashed border-black my-2"></div>

      {/* Footer */}
      <div className="text-center text-[10px]">
        <p>Thank you for choosing {branch.name}!</p>
        <p>Goods once sold not returnable</p>
        <p className="mt-2">*** Karibu Tena! ***</p>
        <p className="mt-2">Powered by Club Marina POS</p>
      </div>
    </div>
  );
});

Receipt.displayName = "Receipt";
export default Receipt;