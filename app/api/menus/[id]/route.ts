import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/admin'

export const revalidate = 60 // Cache for 60 seconds

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Use maybeSingle() to avoid 500 error when no rows are returned
  const { data: menu, error } = await supabase
    .from('bento_menus')
    .select('*, menu_items:bento_menu_items(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching menu:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!menu) {
    return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
  }

  return NextResponse.json(menu)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { data: menu, error } = await supabase
      .from('bento_menus')
      .update({
        name: body.name,
        phone: body.phone,
        additional: body.additional !== undefined ? body.additional : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update menu items if provided
    if (body.menu_items && Array.isArray(body.menu_items)) {
      // Get existing menu items
      const { data: existingItems } = await supabase
        .from('bento_menu_items')
        .select('id')
        .eq('restaurant_id', id)

      const existingIds = new Set((existingItems || []).map(item => item.id))
      const itemsToUpdate: Array<{ id: string; name: string; price: number; type: string | null }> = []
      const itemsToInsert: Array<{ restaurant_id: string; name: string; price: number; type: string | null }> = []
      const providedIds = new Set<string>()

      // Separate items to update vs insert
      body.menu_items.forEach((item: { id?: string; name: string; price: string | number; type?: string }) => {
        const parsedPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price)) || 0
        const parsedType = item.type && String(item.type).trim() ? String(item.type).trim() : null

        if (item.id && existingIds.has(item.id)) {
          // Update existing item
          providedIds.add(item.id)
          itemsToUpdate.push({
            id: item.id,
            name: item.name,
            price: parsedPrice,
            type: parsedType,
          })
        } else {
          // Insert new item
          itemsToInsert.push({
            restaurant_id: id,
            name: item.name,
            price: parsedPrice,
            type: parsedType,
          })
        }
      })

      // Update existing items
      for (const item of itemsToUpdate) {
        const { error: updateError } = await supabase
          .from('bento_menu_items')
          .update({
            name: item.name,
            price: item.price,
            type: item.type,
          })
          .eq('id', item.id)

        if (updateError) {
          console.error('Error updating menu item:', updateError)
          return NextResponse.json({ error: `更新品項失敗: ${updateError.message}` }, { status: 500 })
        }
      }

      // Insert new items
      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('bento_menu_items')
          .insert(itemsToInsert)

        if (insertError) {
          console.error('Error inserting menu items:', insertError)
          return NextResponse.json({ error: `新增品項失敗: ${insertError.message}` }, { status: 500 })
        }
      }

      // Delete items that are no longer in the list (only if they don't have order_items)
      const idsToDelete = Array.from(existingIds).filter(id => !providedIds.has(id))
      if (idsToDelete.length > 0) {
        // Check if any of these items have been ordered
        const { data: orderedItems } = await supabase
          .from('bento_order_items')
          .select('menu_item_id')
          .in('menu_item_id', idsToDelete)

        const orderedIds = new Set((orderedItems || []).map(item => item.menu_item_id))
        const safeToDelete = idsToDelete.filter(id => !orderedIds.has(id))

        // Only delete items that have never been ordered
        if (safeToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('bento_menu_items')
            .delete()
            .in('id', safeToDelete)

          if (deleteError) {
            console.error('Error deleting menu items:', deleteError)
            // Don't return error, just log it
          }
        }
      }
    }

    return NextResponse.json(menu)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 403 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const supabase = await createClient()

    // Check if menu has active orders
    const { data: activeOrders } = await supabase
      .from('bento_orders')
      .select('id')
      .eq('restaurant_id', id)
      .eq('status', 'active')
      .limit(1)

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json(
        { error: '無法刪除店家：仍有進行中的訂單' },
        { status: 400 }
      )
    }

    const { error } = await supabase.from('bento_menus').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 403 }
    )
  }
}

