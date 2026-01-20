import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/admin'
import { NextResponse } from 'next/server'

export const revalidate = 10 // Cache for 10 seconds (orders change frequently)

export async function GET() {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('bento_orders')
    .select('*, restaurants:bento_menus(name, additional), order_items:bento_order_items(*, menu_items:bento_menu_items(name, price))')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Calculate statistics for each order
  const ordersWithStats = orders.map((order: any) => {
    const orderItems = order.order_items || []

    // Count unique users
    const uniqueUsers = new Set(orderItems.map((item: any) => item.user_id))
    const userCount = uniqueUsers.size

    // Count menu items and their quantities
    const menuItemCounts = new Map<string, { name: string; count: number }>()
    orderItems.forEach((item: any) => {
      const menuItemName = item.menu_items?.name
      if (menuItemName) {
        if (menuItemCounts.has(menuItemName)) {
          const existing = menuItemCounts.get(menuItemName)!
          existing.count += 1
        } else {
          menuItemCounts.set(menuItemName, {
            name: menuItemName,
            count: 1,
          })
        }
      }
    })

    // Calculate total items and total price
    const totalItems = orderItems.length
    const totalPrice = orderItems.reduce((sum: number, item: any) => {
      return sum + (parseFloat(String(item.menu_items?.price || 0)))
    }, 0)

    return {
      ...order,
      stats: {
        user_count: userCount,
        menu_item_names: Array.from(menuItemCounts.keys()), // Keep for backward compatibility
        menu_items: Array.from(menuItemCounts.values()), // New: includes count
        total_items: totalItems,
        total_price: totalPrice,
      },
    }
  })

  return NextResponse.json(ordersWithStats)
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin()
    const supabase = await createClient()
    const body = await request.json()

    // Validate order_date
    if (!body.order_date) {
      return NextResponse.json(
        { error: '訂單日期為必填項目' },
        { status: 400 }
      )
    }

    // Generate date-based ID (yyyymmdd format) from order_date
    const orderDate = new Date(body.order_date)
    if (isNaN(orderDate.getTime())) {
      return NextResponse.json(
        { error: '無效的訂單日期格式' },
        { status: 400 }
      )
    }

    const year = orderDate.getFullYear()
    const month = String(orderDate.getMonth() + 1).padStart(2, '0')
    const day = String(orderDate.getDate()).padStart(2, '0')
    const orderId = `${year}${month}${day}`

    // Check if order for the selected date already exists
    const { data: existingOrder } = await supabase
      .from('bento_orders')
      .select('id')
      .eq('id', orderId)
      .maybeSingle()

    if (existingOrder) {
      return NextResponse.json(
        { error: `日期 ${orderId} 已經有訂單了，請使用現有的訂單` },
        { status: 400 }
      )
    }

    const { data: order, error } = await supabase
      .from('bento_orders')
      .insert({
        id: orderId,
        restaurant_id: body.restaurant_id,
        status: 'active',
        created_by: user.id,
        auto_close_at: body.auto_close_at || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 403 }
    )
  }
}

