"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  order_count?: number; // Number of times this item has been ordered in this order
}

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
    name: string;
    email: string;
  };
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

export function AddOrderItemDialog({
  orderId,
  onSuccess,
  updateOrder,
  trigger,
}: {
  orderId: string;
  onSuccess: () => void;
  updateOrder?: (order: Order) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [noSauce, setNoSauce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const { user } = useSupabase();

  useEffect(() => {
    if (open) {
      fetchOrderAndMenu();
    }
  }, [open, orderId]);

  const fetchOrderAndMenu = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      setRestaurantId(data.restaurant_id);

      if (data.restaurants?.id) {
        const menuRes = await fetch(`/api/menus/${data.restaurants.id}`);
        const menuData = await menuRes.json();
        const allMenuItems = menuData.menu_items || [];

        // Calculate order count for each menu item
        const orderItems = data.order_items || [];
        const itemCountMap = new Map<string, number>();

        orderItems.forEach((item: any) => {
          const menuItemId = item.menu_item_id;
          itemCountMap.set(menuItemId, (itemCountMap.get(menuItemId) || 0) + 1);
        });

        // Add order count to menu items and sort
        const menuItemsWithCount = allMenuItems.map((item: MenuItem) => ({
          ...item,
          order_count: itemCountMap.get(item.id) || 0,
        }));

        // Sort by order count (descending), then by price (ascending - cheap first) for all items
        menuItemsWithCount.sort((a: MenuItem, b: MenuItem) => {
          const countA = a.order_count || 0;
          const countB = b.order_count || 0;
          if (countA !== countB) {
            return countB - countA; // Higher count first
          }
          // If same count (including both 0), sort by price ascending (cheap first)
          return b.price - a.price; // Higher price first
        });

        setMenuItems(menuItemsWithCount);
      }
    } catch (error) {
      console.error("Error fetching menu:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !user) return;

    setLoading(true);
    try {
      const selectedMenuItem = menuItems.find(
        (item) => item.id === selectedItem
      );
      if (!selectedMenuItem) return;

      // Create optimistic order item
      const optimisticItem: OrderItem = {
        id: `temp_${Date.now()}`,
        menu_item_id: selectedItem,
        no_sauce: noSauce,
        user_id: user.id,
        menu_items: {
          name: selectedMenuItem.name,
          price: selectedMenuItem.price,
        },
        user: {
          name: user.user_metadata?.name || user.email || "",
          email: user.email || "",
        },
      };

      // Get current order from cache for optimistic update (if updateOrder is provided)
      let currentOrder: Order | null = null;
      if (updateOrder) {
        const { getCache } = await import("@/lib/utils/cache");
        currentOrder = getCache<Order>(`order_${orderId}`) || null;
        if (currentOrder) {
          // Optimistic update: immediately update UI
          const optimisticOrder: Order = {
            ...currentOrder,
            order_items: [...currentOrder.order_items, optimisticItem],
          };
          updateOrder(optimisticOrder);
        }
      }

      try {
        // Sync with server
        const res = await fetch("/api/order-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            menu_item_id: selectedItem,
            no_sauce: noSauce,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to add order item");
        }

        // Fetch fresh order to replace optimistic item (if updateOrder is provided)
        if (updateOrder) {
          const orderRes = await fetch(`/api/orders/${orderId}`);
          if (!orderRes.ok) {
            throw new Error("Failed to fetch order");
          }
          const freshOrder = await orderRes.json();
          updateOrder(freshOrder);
        }

        setOpen(false);
        setSelectedItem("");
        setNoSauce(false);
        onSuccess();
      } catch (error) {
        // Rollback on error (if updateOrder is provided)
        if (updateOrder && currentOrder) {
          updateOrder(currentOrder);
        }
        const err =
          error instanceof Error ? error : new Error("Failed to add item");
        console.error("Error adding order item:", err);
        alert(`新增訂餐失敗: ${err.message}`);
      }
    } catch (error) {
      // Error already handled in onError callback
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>新增訂餐</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增訂餐</DialogTitle>
          <DialogDescription>選擇品項並確認選項</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-4 pb-4">
            <div className="flex-1">
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger id="menuItem" className="w-full">
                  <SelectValue placeholder="選擇品項" />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((item) => {
                    const orderCountText =
                      item.order_count && item.order_count > 0
                        ? `（${item.order_count} 個訂餐）`
                        : "";
                    return (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} - NT$ {item.price.toLocaleString()}{" "}
                        {orderCountText}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="noSauce"
                checked={noSauce}
                onCheckedChange={(checked) => setNoSauce(checked === true)}
              />
              <Label
                htmlFor="noSauce"
                className="cursor-pointer whitespace-nowrap"
              >
                不醬
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading || !selectedItem}>
              {loading ? "新增中..." : "新增"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
