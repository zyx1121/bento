import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  const supabase = await createClient();

  // Get all order items with user and menu item information
  const { data: orderItems, error: orderItemsError } = await supabase
    .from("bento_order_items")
    .select(
      "user_id, menu_item_id, order_id, menu_items:bento_menu_items(price, name)"
    );

  if (orderItemsError) {
    return NextResponse.json(
      { error: orderItemsError.message },
      { status: 500 }
    );
  }

  // Get all user profiles
  const userIds = new Set<string>();
  orderItems?.forEach((item: any) => {
    if (item.user_id) {
      userIds.add(item.user_id);
    }
  });

  let userProfilesMap = new Map<
    string,
    { id: string; name: string | null; avatarUrl: string | null }
  >();
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, name")
      .in("id", Array.from(userIds));

    if (profiles) {
      // Just use profiles without avatars
      profiles.forEach((profile: any) => {
        userProfilesMap.set(profile.id, {
          id: profile.id,
          name: profile.name,
          avatarUrl: null,
        });
      });
    }
  }

  // Calculate statistics for each user
  const userStats = new Map<
    string,
    {
      userId: string;
      userName: string | null;
      totalSpending: number;
      uniqueMenuItems: Set<string>;
      orderIds: Set<string>;
    }
  >();

  orderItems?.forEach((item: any) => {
    const userId = item.user_id;
    if (!userId) return;

    if (!userStats.has(userId)) {
      const profile = userProfilesMap.get(userId);
      userStats.set(userId, {
        userId,
        userName: profile?.name || null,
        totalSpending: 0,
        uniqueMenuItems: new Set(),
        orderIds: new Set(),
      });
    }

    const stats = userStats.get(userId)!;
    const price = parseFloat(String(item.menu_items?.price || 0));
    stats.totalSpending += price;

    if (item.menu_item_id) {
      stats.uniqueMenuItems.add(item.menu_item_id);
    }

    if (item.order_id) {
      stats.orderIds.add(item.order_id);
    }
  });

  // Convert to arrays and sort
  const allUsers = Array.from(userStats.values());

  // Helper function to group users by value and get top 5 ranks
  const groupByValue = (
    users: Array<{
      userId: string;
      userName: string | null;
      totalSpending: number;
      uniqueMenuItems: Set<string>;
      orderIds: Set<string>;
    }>,
    getValue: (user: {
      userId: string;
      userName: string | null;
      totalSpending: number;
      uniqueMenuItems: Set<string>;
      orderIds: Set<string>;
    }) => number
  ) => {
    // Group users by value
    const valueMap = new Map<
      number,
      Array<{ userId: string; userName: string; avatarUrl: string | null }>
    >();
    users.forEach((user) => {
      const value = getValue(user);
      if (!valueMap.has(value)) {
        valueMap.set(value, []);
      }
      const profile = userProfilesMap.get(user.userId);
      valueMap.get(value)!.push({
        userId: user.userId,
        userName: user.userName || "未知",
        avatarUrl: profile?.avatarUrl || null,
      });
    });

    // Sort by value descending and get top 5
    const sortedValues = Array.from(valueMap.entries())
      .sort((a, b) => b[0] - a[0])
      .slice(0, 5);

    return sortedValues.map(([value, users]) => ({
      value,
      users,
    }));
  };

  // Top 5 by spending
  const topSpenders = groupByValue(allUsers, (user) => user.totalSpending);

  // Top 5 by variety (unique menu items)
  const topVariety = groupByValue(
    allUsers,
    (user) => user.uniqueMenuItems.size
  );

  // Top 5 by participation (unique orders)
  const topParticipants = groupByValue(allUsers, (user) => user.orderIds.size);

  return NextResponse.json({
    topSpenders,
    topVariety,
    topParticipants,
  });
}
