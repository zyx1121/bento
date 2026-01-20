import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data: orderItem, error } = await supabase
    .from('bento_order_items')
    .insert({
      order_id: body.order_id,
      menu_item_id: body.menu_item_id,
      user_id: user.id,
      no_sauce: body.no_sauce || false,
      additional: body.additional !== undefined ? body.additional : null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(orderItem, { status: 201 })
}

