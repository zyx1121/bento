import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/admin";
import { NextResponse } from "next/server";

export const revalidate = 300; // Cache for 5 minutes (menus don't change often)

export async function GET() {
  const supabase = await createClient();

  const { data: menus, error } = await supabase
    .from("bento_menus")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(menus);
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin();
    const supabase = await createClient();
    const body = await request.json();

    // Validate input
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: "店家名稱和電話為必填項目" },
        { status: 400 }
      );
    }

    const { data: menu, error } = await supabase
      .from("bento_menus")
      .insert({
        name: body.name,
        phone: body.phone,
        additional: body.additional || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating menu:", error);
      return NextResponse.json(
        { error: `建立店家失敗: ${error.message}` },
        { status: 500 }
      );
    }

    // Insert menu items if provided
    if (
      body.menu_items &&
      Array.isArray(body.menu_items) &&
      body.menu_items.length > 0
    ) {
      const menuItems = body.menu_items
        .filter(
          (item: { name: string; price: string | number; type?: string }) =>
            item.name && item.price
        )
        .map((item: { name: string; price: string | number; type?: string }) => ({
          restaurant_id: menu.id,
          name: item.name.trim(),
          price:
            typeof item.price === "number"
              ? item.price
              : parseFloat(String(item.price)) || 0,
          type: item.type && item.type.trim() ? item.type.trim() : null,
        }));

      if (menuItems.length > 0) {
        const { error: menuError } = await supabase
          .from("bento_menu_items")
          .insert(menuItems);

        if (menuError) {
          console.error("Error creating menu items:", menuError);
          // Still return success for menu, but log menu error
          return NextResponse.json(
            {
              menu,
              warning: `店家已建立，但部分品項建立失敗: ${menuError.message}`,
            },
            { status: 201 }
          );
        }
      }
    }

    return NextResponse.json(menu, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/menus:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "建立店家失敗，請確認您有管理員權限",
      },
      {
        status:
          error instanceof Error && error.message.includes("Forbidden")
            ? 403
            : 500,
      }
    );
  }
}
