export type Fulfillment = "delivery" | "pickup";
export type Category = "classic" | "signature" | "vegetarian";

export interface Pizza {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  vegetarian: boolean;
  spicy: boolean;
  image: string;
  badge?: string;
}

export interface MenuResponse {
  items: Pizza[];
  deliveryFee: number;
  freeDeliveryThreshold: number;
}

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
}

export interface Order {
  id: string;
  number: string;
  status: "confirmed";
  createdAt: string;
  items: { id: string; name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customer: Customer;
  fulfillment: Fulfillment;
  paymentMethod: "cash";
  estimatedMinutes: number;
}

export interface OrderResponse {
  order: Order;
}
