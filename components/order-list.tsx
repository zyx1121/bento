"use client";

import { useAuth } from "@/contexts/auth-context";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { isAdmin } from "@/lib/utils/admin-client";
import { useEffect, useState } from "react";
import { OrderCard } from "./order-card";

interface Order {
  id: string;
  restaurant_id: string;
  status: "active" | "closed";
  created_at: string;
  closed_at: string | null;
  restaurants: {
    name: string;
  };
  order_items?: {
    menu_item_id: string;
    no_sauce?: boolean;
    menu_items: {
      name: string;
      price: number;
    };
    user_id: string;
  }[];
}

export function OrderList() {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const { user } = useAuth();

  const {
    data: orders = [],
    loading,
    refetch,
    invalidateCache,
    updateData,
  } = useCachedFetch<Order[]>({
    cacheKey: "orders",
    fetchFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (user) {
      checkAdmin();
    } else {
      setAdminLoading(false);
    }
  }, [user]);

  // Listen for order update events to refresh the list
  useEffect(() => {
    const handleOrderUpdate = () => {
      invalidateCache();
      refetch();
    };

    window.addEventListener("order-updated", handleOrderUpdate);
    return () => {
      window.removeEventListener("order-updated", handleOrderUpdate);
    };
  }, [invalidateCache, refetch]);

  const checkAdmin = async () => {
    if (!user) {
      setAdminLoading(false);
      return;
    }
    try {
      const admin = await isAdmin(user.id);
      setIsAdminUser(admin);
    } catch {
      setIsAdminUser(false);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleOrderUpdate = () => {
    // Clear cache and force refresh when order is created/updated
    invalidateCache();
    refetch();
  };

  const activeOrders = (orders || []).filter((o) => o.status === "active");
  const closedOrders = (orders || []).filter((o) => o.status === "closed");

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto">
      {activeOrders.length > 0 && (
        <div className="mb-8">
          <h1 className="text-xl font-bold mb-6 mx-2">進行中</h1>
          <div className="space-y-4">
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {closedOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-6 mx-2">已結束</h2>
          <div className="space-y-4">
            {closedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {(orders || []).length === 0 && (
        <div className="text-center py-12 text-muted-foreground">尚無訂單</div>
      )}
    </div>
  );
}
