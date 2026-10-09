export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  department: 'bar' | 'kitchen' | 'both';
  branchId: string;
  active: boolean;
}
export interface Category { id: string; name: string; department: string; }
export interface Table { id: string; name: string; location: string; capacity: number; status: 'available' | 'occupied'; }
export interface Supplier { id: string; name: string; phone: string; email: string; }