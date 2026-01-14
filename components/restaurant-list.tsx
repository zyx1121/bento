"use client";

import { useAuth } from "@/contexts/auth-context";
import { useCachedFetch } from "@/lib/hooks/use-cached-fetch";
import { isAdmin } from "@/lib/utils/admin-client";
import { useEffect, useState } from "react";
import { RestaurantCard } from "./restaurant-card";

interface Restaurant {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export function RestaurantList() {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const { user } = useAuth();

  const {
    data: restaurants = [],
    loading,
    refetch,
    invalidateCache,
  } = useCachedFetch<Restaurant[]>({
    cacheKey: "restaurants",
    fetchFn: async () => {
      const res = await fetch("/api/menus");
      if (!res.ok) {
        throw new Error("Failed to fetch restaurants");
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

  const handleRestaurantUpdate = () => {
    // Force refresh when restaurant is updated
    invalidateCache();
    refetch();
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-6 mx-2">店家列表</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(restaurants || []).map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            isAdmin={isAdminUser}
            onUpdate={handleRestaurantUpdate}
          />
        ))}
      </div>

      {(restaurants || []).length === 0 && (
        <div className="text-center py-12 text-muted-foreground">尚無店家</div>
      )}
    </div>
  );
}
