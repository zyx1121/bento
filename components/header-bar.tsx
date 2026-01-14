"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/utils/admin-client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AddOrderItemDialog } from "./add-order-item-dialog";
import { CreateOrderDialog } from "./create-order-dialog";
import { CreateRestaurantDialog } from "./create-restaurant-dialog";

export default function HeaderBar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<"active" | "closed" | null>(
    null
  );

  useEffect(() => {
    if (user) {
      checkAdmin();
    } else {
      setAdminLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Extract order ID from pathname if on order detail page
    if (pathname?.startsWith("/orders/")) {
      const id = pathname.split("/orders/")[1];
      setOrderId(id || null);
      // Fetch order status
      if (id) {
        fetchOrderStatus(id);
      }
    } else {
      setOrderId(null);
      setOrderStatus(null);
    }
  }, [pathname]);

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

  const fetchOrderStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrderStatus(data.status);
      }
    } catch (error) {
      console.error("Error fetching order status:", error);
    }
  };

  const handleLogin = async (provider: "google" | "keycloak") => {
    // Use current origin instead of environment variable to ensure consistency
    const redirectTo = `${window.location.origin}/api/auth/callback`;

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes: provider === "keycloak" ? "openid" : undefined,
      },
    });
  };

  const handleAvatarClick = () => {
    router.push("/me");
  };

  const handleCloseOrder = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/close`, {
        method: "POST",
      });
      if (res.ok) {
        setOrderStatus("closed");
        // Clear cache and refresh
        const { clearCache } = await import("@/lib/utils/cache");
        clearCache("orders");
        clearCache(`order_${orderId}`);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "關閉訂單失敗");
      }
    } catch (error) {
      console.error("Error closing order:", error);
      alert("關閉訂單失敗");
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderId) return;
    if (!confirm(`確定要刪除訂單嗎？\n\n此操作將永久刪除訂單，且無法復原。`)) {
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

      // Clear cache
      const { clearCache } = await import("@/lib/utils/cache");
      clearCache("orders");
      clearCache(`order_${orderId}`);

      router.push("/");
    } catch (error) {
      console.error("Error deleting order:", error);
      alert(error instanceof Error ? error.message : "刪除訂單失敗");
    }
  };

  return (
    <header className="flex items-center justify-between p-4 px-6 w-full max-w-5xl mx-auto">
      {/* Left side - Navigation links */}
      <nav className="flex items-center gap-6">
        <Link href="/" className="font-semibold text-lg">
          訂單
        </Link>
        <Link href="/menus" className="font-semibold text-lg">
          店家
        </Link>
        <Link href="/rank" className="font-semibold text-lg">
          排名
        </Link>
      </nav>

      {/* Right side - User area */}
      <div className="flex items-center gap-3">
        {/* Admin actions */}
        {!adminLoading && isAdminUser && user && (
          <>
            {/* Create order button (on order list page) */}
            {pathname === "/" && (
              <CreateOrderDialog
                trigger={
                  <Button
                    size="sm"
                    className="animate-in fade-in slide-in-from-right-2 duration-200"
                  >
                    新增訂單
                  </Button>
                }
                onSuccess={async () => {
                  // Clear cache and notify order list to refresh
                  const { clearCache } = await import("@/lib/utils/cache");
                  clearCache("orders");
                  window.dispatchEvent(new CustomEvent("order-updated"));
                  router.refresh();
                }}
              />
            )}

            {/* Create restaurant button (on restaurant list page) */}
            {pathname === "/menus" && (
              <CreateRestaurantDialog
                trigger={
                  <Button
                    size="sm"
                    className="animate-in fade-in slide-in-from-right-2 duration-200"
                  >
                    新增店家
                  </Button>
                }
                onSuccess={() => {
                  router.refresh();
                }}
              />
            )}

            {/* Order actions (on order detail page) */}
            {orderId && orderStatus === "active" && (
              <>
                <Button
                  onClick={handleDeleteOrder}
                  variant="destructive"
                  size="sm"
                  className="animate-in fade-in slide-in-from-right-2 duration-200"
                >
                  刪除訂單
                </Button>
                <Button
                  onClick={handleCloseOrder}
                  variant="default"
                  size="sm"
                  className="animate-in fade-in slide-in-from-right-2 duration-200"
                >
                  關閉訂單
                </Button>
              </>
            )}
          </>
        )}

        {/* Add order item button (on order detail page, for all logged-in users) */}
        {orderId && orderStatus === "active" && user && (
          <AddOrderItemDialog
            orderId={orderId}
            trigger={
              <Button
                size="sm"
                className="animate-in fade-in slide-in-from-right-2 duration-200"
              >
                新增訂餐
              </Button>
            }
            onSuccess={async () => {
              // Clear cache
              const { clearCache } = await import("@/lib/utils/cache");
              clearCache("orders");
              clearCache(`order_${orderId}`);

              // Dispatch custom event to trigger order list and detail refresh
              window.dispatchEvent(
                new CustomEvent("order-updated", {
                  detail: { orderId },
                })
              );

              router.refresh();
            }}
          />
        )}

        {/* User avatar */}
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        ) : user ? (
          <button
            onClick={handleAvatarClick}
            className="cursor-pointer transition-opacity hover:opacity-80"
          >
            <Avatar>
              <AvatarImage
                src={user.user_metadata?.avatar_url}
                alt={user.email}
              />
              <AvatarFallback>
                {user.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        ) : (
          <Button
            size="sm"
            onClick={() => handleLogin("keycloak")}
            className="animate-in fade-in duration-200"
          >
            登入
          </Button>
          // <Dialog>
          //   <DialogTrigger asChild>
          //     <Button size="sm" className="animate-in fade-in duration-200">
          //       登入
          //     </Button>
          //   </DialogTrigger>
          //   <DialogContent className="sm:max-w-[360px]">
          //     <DialogHeader>
          //       <DialogTitle>選擇登入方式</DialogTitle>
          //       <DialogDescription>
          //         使用 Keycloak 進行登入。
          //       </DialogDescription>
          //     </DialogHeader>
          //     <div className="grid gap-3">
          //       <Button
          //         variant="outline"
          //         onClick={() => handleLogin("keycloak")}
          //         className="justify-center"
          //       >
          //         使用 Keycloak 登入
          //       </Button>
          //     </div>
          //   </DialogContent>
          // </Dialog>
        )}
      </div>
    </header>
  );
}
