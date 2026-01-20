"use client";

import { OrderStats } from "./order-stats";
import { Badge } from "./ui/badge";

interface OrderItem {
  menu_item_id: string;
  no_sauce?: boolean;
  additional?: number | null;
  menu_items: {
    name: string;
    price: number;
  };
  user_id: string;
}

interface Order {
  id: string;
  restaurant_id: string;
  status: "active" | "closed";
  created_at: string;
  closed_at: string | null;
  restaurants: {
    id: string;
    name: string;
    phone: string;
    additional?: string[] | null;
  };
  order_items?: OrderItem[];
}

// Parse order date from ID (yyyymmdd format)
function parseOrderDate(orderId: string): string {
  if (orderId.length === 8 && /^\d{8}$/.test(orderId)) {
    const year = orderId.substring(0, 4);
    const month = orderId.substring(4, 6);
    const day = orderId.substring(6, 8);
    return `${year}/${month}/${day}`;
  }
  return orderId; // Fallback to ID if format is unexpected
}

export function OrderDetailHeader({ order }: { order: Order }) {
  const orderDate = parseOrderDate(order.id);
  const orderItems = order.order_items || [];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold mb-4">
              {order.restaurants.name}
            </h1>
            <Badge variant="default" className="text-sm">
              {orderDate}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            電話：
            <a
              href={`tel:${order.restaurants.phone}`}
              className="text-primary hover:underline"
            >
              {order.restaurants.phone}
            </a>
          </p>
        </div>
      </div>
      <OrderStats
        orderItems={orderItems}
        restaurantAdditional={order.restaurants?.additional || null}
      />
    </div>
  );
}
