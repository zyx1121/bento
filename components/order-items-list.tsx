"use client";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "./ui/item";

interface OrderItem {
  id: string;
  menu_item_id: string;
  no_sauce: boolean;
  additional: number | null;
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
    additional: string[] | null;
  };
  order_items: OrderItem[];
}

interface GroupedOrderItem {
  user_id: string;
  user_name: string | null;
  items: OrderItem[];
  total: number;
}

export function OrderItemsList({
  items,
  isActive,
  currentUserId,
  currentUserName,
  onDelete,
  orderId,
  updateOrder,
  restaurantAdditional,
}: {
  items: OrderItem[];
  isActive: boolean;
  currentUserId?: string;
  currentUserName?: string | null;
  onDelete: () => void;
  orderId?: string;
  updateOrder?: (order: Order) => void;
  restaurantAdditional?: string[] | null;
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

  // Group items by user
  const groupedItems = items.reduce((acc, item) => {
    const userId = item.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user_id: userId,
        user_name: item.user?.name || null,
        items: [],
        total: 0,
      };
    }
    acc[userId].items.push(item);
    acc[userId].total += item.menu_items?.price || 0;
    return acc;
  }, {} as Record<string, GroupedOrderItem>);

  // Sort: current user first, then others by total descending
  const groupedItemsArray = Object.values(groupedItems).sort((a, b) => {
    // If current user exists, put them first
    if (currentUserId) {
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;
    }
    // Sort others by total descending
    return b.total - a.total;
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">尚無訂餐項目</div>
    );
  }

  return (
    <ItemGroup className="gap-4">
      {groupedItemsArray.map((group, index) => (
        <div key={group.user_id}>
          <Item variant="outline" className="text-lg">
            <ItemContent className="flex-1">
              <ItemTitle className="text-lg">
                {group.user_name || "未知"}
              </ItemTitle>
              <div className="flex flex-col gap-1.5 mt-1.5 text-muted-foreground">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <span>{item.menu_items?.name}</span>
                    {item.no_sauce && (
                      <Badge
                        variant="secondary"
                        className="text-[11px] px-2 py-0.5"
                      >
                        不醬
                      </Badge>
                    )}
                    {item.additional !== null &&
                      item.additional !== undefined &&
                      restaurantAdditional &&
                      restaurantAdditional[item.additional] && (
                        <Badge
                          variant="secondary"
                          className="text-[11px] px-2 py-0.5"
                        >
                          {restaurantAdditional[item.additional]}
                        </Badge>
                      )}
                    {isActive && currentUserId === item.user_id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 px-3 py-0"
                        onClick={() => handleDelete(item.id)}
                      >
                        刪除
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ItemContent>
            <ItemActions>
              <div className="text-right font-medium">
                <div className="text-lg text-muted-foreground">總計</div>
                <div
                  className={`text-lg ${group.total > 140 ? "text-destructive" : ""
                    }`}
                >
                  NT$ {group.total.toLocaleString()}
                </div>
              </div>
            </ItemActions>
          </Item>
          {index < groupedItemsArray.length - 1 && <ItemSeparator />}
        </div>
      ))}
    </ItemGroup>
  );
}
