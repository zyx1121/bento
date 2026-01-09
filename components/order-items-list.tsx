"use client";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface OrderItem {
  id: string;
  menu_item_id: string;
  no_sauce: boolean;
  user_id: string;
  menu_items: {
    name: string;
    price: number;
  };
  user: {
    name: string | null;
    email?: string; // Optional, may not be returned for privacy
  } | null;
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
  };
  order_items: OrderItem[];
}

export function OrderItemsList({
  items,
  isActive,
  currentUserId,
  currentUserName,
  onDelete,
  orderId,
  updateOrder,
}: {
  items: OrderItem[];
  isActive: boolean;
  currentUserId?: string;
  currentUserName?: string | null;
  onDelete: () => void;
  orderId?: string;
  updateOrder?: (order: Order) => void;
}) {
  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此訂餐項目嗎？") || !orderId) return;

    const itemToDelete = items.find((item) => item.id === id);
    if (!itemToDelete) return;

    if (!orderId || !updateOrder) return;

    // Get current order from cache for optimistic update
    const { getCache } = await import("@/lib/utils/cache");
    const currentOrder = getCache<Order>(`order_${orderId}`);
    if (!currentOrder) {
      alert("無法取得訂單資料");
      return;
    }

    // Optimistic update: immediately update UI
    const optimisticOrder: Order = {
      ...currentOrder,
      order_items: currentOrder.order_items.filter((item) => item.id !== id),
    };
    updateOrder(optimisticOrder);

    try {
      // Sync with server
      const res = await fetch(`/api/order-items/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete order item");
      }

      // Fetch fresh order
      const orderRes = await fetch(`/api/orders/${orderId}`);
      if (!orderRes.ok) {
        throw new Error("Failed to fetch order");
      }
      const freshOrder = await orderRes.json();

      // Update with server data
      updateOrder(freshOrder);
      onDelete();
    } catch (error) {
      // Rollback on error
      updateOrder(currentOrder);
      const err =
        error instanceof Error ? error : new Error("Failed to delete");
      console.error("Error deleting item:", err);
      alert(`刪除失敗: ${err.message}`);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">尚無訂餐項目</div>
    );
  }

  return (
    <Table className="text-base">
      <TableHeader>
        <TableRow>
          <TableHead>姓名</TableHead>
          <TableHead>品項</TableHead>
          <TableHead className="text-right">金額</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id} className="h-11">
            <TableCell>
              {item.user?.name ||
                (currentUserId &&
                currentUserName &&
                item.user_id === currentUserId
                  ? currentUserName
                  : "未知")}
            </TableCell>
            <TableCell>
              {item.menu_items?.name || "未知"}
              {item.no_sauce && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-[11px] px-2 py-0.5"
                >
                  不醬
                </Badge>
              )}
              {isActive && currentUserId === item.user_id && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-2 h-7 px-3 py-0 align-middle"
                  onClick={() => handleDelete(item.id)}
                >
                  刪除
                </Button>
              )}
            </TableCell>
            <TableCell className="text-right">
              NT$ {(item.menu_items?.price || 0).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
