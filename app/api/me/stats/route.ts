import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get order count
  const { data: orderItems } = await supabase
    .from('bento_order_items')
    .select('order_id, menu_item_id, menu_items:bento_menu_items(price, name, restaurant_id)')
    .eq('user_id', user.id)

  // Get restaurant names separately
  const restaurantIds = new Set<string>()
  orderItems?.forEach((item: any) => {
    if (item.menu_items?.restaurant_id) {
      restaurantIds.add(item.menu_items.restaurant_id)
    }
  })

  let restaurantMap = new Map<string, string>()
  if (restaurantIds.size > 0) {
    const { data: restaurants } = await supabase
      .from('bento_menus')
      .select('id, name')
      .in('id', Array.from(restaurantIds))

    if (restaurants) {
      restaurantMap = new Map(restaurants.map((r: any) => [r.id, r.name]))
    }
  }

  const orderIds = new Set<string>()
  let totalSpending = 0
  // Count restaurant + item combinations (店名 品項名)
  const restaurantItemCounts: Record<string, { name: string; count: number }> = {}

  orderItems?.forEach((item: any) => {
    orderIds.add(item.order_id)
    const price = parseFloat(String(item.menu_items?.price || 0))
    totalSpending += price

    // Count restaurant + item combinations
    const restaurantId = item.menu_items?.restaurant_id
    const menuItemName = item.menu_items?.name || ''
    const restaurantName = restaurantId ? (restaurantMap.get(restaurantId) || '') : ''

    if (restaurantName && menuItemName) {
      const key = `${restaurantId}_${item.menu_item_id}`
      if (!restaurantItemCounts[key]) {
        restaurantItemCounts[key] = {
          name: `${restaurantName} ${menuItemName}`,
          count: 0,
        }
      }
      restaurantItemCounts[key].count += 1
    }
  })

  // Get top items (restaurant + item combinations)
  const topRestaurantItems = Object.values(restaurantItemCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return NextResponse.json({
    order_count: orderIds.size,
    total_spending: totalSpending,
    top_restaurant_items: topRestaurantItems,
  })
}

