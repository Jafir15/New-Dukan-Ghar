export interface Category {
  id: string;
  name: string;
  nameUrdu: string;
  type: "product" | "vehicle";
  icon?: string | null;
  imageUrl?: string | null;
}

export interface Product {
  id: string;
  name: string;
  nameUrdu: string;
  price: number;
  originalPrice?: number | null;
  unit: "kg" | "gram" | "liter" | "pound" | "piece" | "dozen" | "box" | "packet";
  stock: number;
  categoryId: string | null;
  featured: boolean;
  imageUrl?: string | null;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: any[];
  total: number;
  deliveryCharge?: number;
  status: "pending" | "packed" | "on_the_way" | "delivered";
  trackingNumber: string;
  sessionId: string;
  userId?: string | null;
  paymentMethod: "cod" | "online" | "wallet";
  paymentScreenshot?: string | null;
  couponCode?: string | null;
  discountAmount?: number;
  createdAt: any;
}

export interface Vehicle {
  id: string;
  name: string;
  nameUrdu: string;
  type: "rickshaw" | "chigchi" | "carry_bolan" | "car" | "high_roof" | "bus";
  baseRent: number;
  imageUrl?: string | null;
}

export interface Booking {
  id: string;
  vehicleId: string;
  vehicleNameUrdu: string;
  customerName: string;
  customerPhone: string;
  passengersDetail: string;
  luggageDetail: string;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  adminAddress: string | null;
  agreedRent: number | null;
  sessionId: string;
  userId?: string | null;
  travelTime?: string | null;
  assignedVehicleName?: string | null;
  driverName?: string | null;
  assignedVehicleNumber?: string | null;
  driverNumber?: string | null;
  createdAt: any;
}

export interface PaymentMethod {
  id: string;
  bankName: string;
  accountNumber: string;
  holderName: string;
  logoUrl?: string | null;
  active: boolean;
}

export interface Slider {
  id: string;
  imageUrl: string;
  linkUrl?: string | null;
  active: boolean;
  createdAt: any;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  discountPercentage?: string | null;
  productId?: string | null;
  linkUrl?: string | null;
  type?: 'banner' | 'alert';
  userId?: string | null;
  timestamp: any;
}

export interface User {
  uid: string;
  name: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  balance: number;
  isBlocked: boolean;
  role: "user" | "admin";
  createdAt: any;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  type: "deposit" | "withdraw";
  amount: number;
  method: string;
  accountName: string;
  accountNumber: string;
  proofScreenshot?: string | null;
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
  createdAt: any;
}

export interface CustomRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  details: string;
  imageUrl?: string | null;
  deliveryCharge?: number | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  sessionId: string;
  userId?: string | null;
  adminNotes?: string | null;
  createdAt: any;
}

export interface PromoBox {
  id: string; // 'box1' | 'box2' | 'box3'
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  linkUrl: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountAmount?: number;
  discountPercentage?: number;
  isFreeDelivery?: boolean;
  quantity: number;
  active: boolean;
  createdAt: any;
}
