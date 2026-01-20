"use client";

import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

interface OrderItemForStats {
  menu_item_id: string;
  no_sauce?: boolean;
  additional?: number | null;
  menu_items: {
    name: string;
    price: number;
  };
  user_id: string;
}

interface OrderStatsProps {
  orderItems: OrderItemForStats[];
  restaurantAdditional?: string[] | null;
  className?: string;
}

export function OrderStats({ orderItems, restaurantAdditional, className }: OrderStatsProps) {
  const items = orderItems || [];

  // Calculate statistics
  const uniqueUsers = new Set(items.map((item) => item.user_id));
  const userCount = uniqueUsers.size;

  // Count menu items by option combinations (no_sauce + additional)
  // Key: menu_item_id, Value: Map of option combination to count
  type OptionCombination = {
    noSauce: boolean;
    additional: number | null;
  };

  const menuItemCounts = new Map<
    string,
    {
      name: string;
      price: number;
      totalCount: number;
      combinations: Map<string, number>; // Map of combination key to count
    }
  >();

  items.forEach((item) => {
    const menuItemId = item.menu_item_id;
    const menuItemName = item.menu_items?.name || "未知品項";
    const menuItemPrice = item.menu_items?.price || 0;

    // Create combination key: "noSauce:true,additional:0" or "noSauce:false,additional:null"
    const combination: OptionCombination = {
      noSauce: item.no_sauce || false,
      additional: item.additional !== null && item.additional !== undefined ? item.additional : null,
    };
    const combinationKey = `noSauce:${combination.noSauce},additional:${combination.additional}`;

    if (menuItemCounts.has(menuItemId)) {
      const existing = menuItemCounts.get(menuItemId)!;
      existing.totalCount += 1;
      const currentCount = existing.combinations.get(combinationKey) || 0;
      existing.combinations.set(combinationKey, currentCount + 1);
    } else {
      const combinations = new Map<string, number>();
      combinations.set(combinationKey, 1);
      menuItemCounts.set(menuItemId, {
        name: menuItemName,
        price: menuItemPrice,
        totalCount: 1,
        combinations,
      });
    }
  });

  // Calculate total price
  const totalPrice = items.reduce((sum, item) => {
    return sum + (item.menu_items?.price || 0);
  }, 0);

  // Format menu items list for Badge display, sorted by total count desc
  const menuItemsList = Array.from(menuItemCounts.values()).sort(
    (a, b) => b.totalCount - a.totalCount
  );

  return (
    <div
      className={cn(
        "text-base text-muted-foreground space-y-4",
        className
      )}
    >
      <p>
        已有 <span className="font-bold text-foreground">{userCount}</span>{" "}
        人訂餐，{" "}
        <span className="font-bold text-foreground">{items.length}</span>{" "}
        項餐點，共 NT${" "}
        <span className="font-bold text-primary">
          {totalPrice.toLocaleString()}
        </span>
      </p>
      {menuItemsList.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {menuItemsList.map((item, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-sm px-3 py-1"
            >
              {item.name}{" "}
              <span className="font-semibold">{item.totalCount}</span> 份
              {Array.from(item.combinations.entries())
                .sort((a, b) => b[1] - a[1]) // Sort by count descending
                .map(([combinationKey, count]) => {
                  // Parse combination key
                  const parts = combinationKey.split(",");
                  const noSauce = parts[0].split(":")[1] === "true";
                  const additionalStr = parts[1].split(":")[1];
                  const additional = additionalStr === "null" ? null : parseInt(additionalStr);

                  // Build option text
                  const options: string[] = [];
                  if (noSauce) {
                    options.push("不醬");
                  }
                  if (additional !== null && restaurantAdditional && restaurantAdditional[additional]) {
                    options.push(restaurantAdditional[additional]);
                  }

                  // Only show parentheses if there are options
                  if (options.length > 0) {
                    return (
                      <span key={combinationKey} className="text-xs text-muted-foreground ml-1">
                        （{options.join(" ")} {count} 份）
                      </span>
                    );
                  }
                  return null;
                })
                .filter((item): item is React.ReactElement => item !== null)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}


