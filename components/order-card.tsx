"use client";

import Link from "next/link";
import { OrderStats } from "./order-stats";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

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
    name: string;
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

export function OrderCard({ order }: { order: Order }) {
  const orderDate = parseOrderDate(order.id);
  const orderItems = order.order_items || [];

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="p-4 mb-3 hover:bg-accent transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-xl">
                {order.restaurants.name}
              </h3>
              <Badge
                variant={order.status === "active" ? "default" : "outline"}
                className="text-sm"
              >
                {orderDate}
              </Badge>
            </div>
            <OrderStats
              orderItems={orderItems}
              restaurantAdditional={order.restaurants?.additional || null}
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}
