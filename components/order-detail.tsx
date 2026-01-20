"use client";

import { useAuth } from "@/contexts/auth-context";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { isAdmin } from "@/lib/utils/admin-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderDetailHeader } from "./order-detail-header";
import { OrderItemsList } from "./order-items-list";

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
    email?: string;
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

export function OrderDetail({ orderId }: { orderId: string }) {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  const {
    data: order,
    loading,
    refetch,
    invalidateCache,
    updateData,
  } = useCachedFetch<Order>({
    cacheKey: `order_${orderId}`,
    fetchFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch order");
      }
      return res.json();
    },
    skipCache: !orderId,
  });

  useEffect(() => {
    if (user) {
      checkAdmin();
    } else {
      setAdminLoading(false);
    }
  }, [user]);

  // When user logs in after page load, refetch order so user names are populated
  // Note: With new cache mechanism, this will automatically fetch on mount anyway
  useEffect(() => {
    if (!user) return;
    // Invalidate anon cached order and fetch again with authenticated context
    invalidateCache();
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Listen for order update events to refresh the order detail
  useEffect(() => {
    const handleOrderUpdate = () => {
      // Refresh this order's data
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

  const handleCloseOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/close`, {
        method: "POST",
      });
      if (res.ok) {
        // Clear cache and force refresh
        invalidateCache();
        // Also clear orders list cache
        const { clearCache } = await import("@/lib/utils/cache");
        clearCache("orders");
        refetch();
      }
    } catch (error) {
      console.error("Error closing order:", error);
    }
  };

  const handleDeleteOrder = async () => {
    if (
      !confirm(
        `確定要刪除訂單「${order?.restaurants.name}」嗎？\n\n此操作將永久刪除訂單，且無法復原。`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete order");
      }

      // Clear all caches
      invalidateCache();
      const { clearCache } = await import("@/lib/utils/cache");
      clearCache("orders");

      // Redirect to orders list
      router.push("/");
    } catch (error) {
      console.error("Error deleting order:", error);
      alert(error instanceof Error ? error.message : "刪除訂單失敗");
    }
  };

  if (!order) {
    return <div className="container mx-auto px-4 py-8">訂單不存在</div>;
  }

  const isActive = order.status === "active";

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto">
      <OrderDetailHeader order={order} />
      <div>
        <h2 className="text-2xl font-semibold mb-4">訂單項目</h2>
        <OrderItemsList
          items={order.order_items}
          isActive={isActive}
          currentUserId={user?.id}
          currentUserName={user?.user_metadata?.name || user?.email || null}
          orderId={orderId}
          updateOrder={updateData}
          restaurantAdditional={order.restaurants?.additional || null}
          onDelete={async () => {
            // Also clear orders list cache
            const { clearCache } = await import("@/lib/utils/cache");
            clearCache("orders");
          }}
        />
      </div>
    </div>
  );
}
