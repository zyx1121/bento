"use client";

import { useState } from "react";
import { MenuImageUpload } from "./menu-image-upload";
import { MenuParser } from "./menu-parser";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface MenuItem {
  name: string;
  price: string;
  type?: string | null;
}

export function CreateRestaurantDialog({
  onSuccess,
  trigger,
}: {
  onSuccess: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [additionalOptions, setAdditionalOptions] = useState<string[]>([]);
  const [newAdditionalOption, setNewAdditionalOption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setLoading(true);
    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          menu_items: menuItems,
          additional: additionalOptions.length > 0 ? additionalOptions : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create restaurant");
      }

      if (data.warning) {
        alert(`警告: ${data.warning}`);
      }

      setOpen(false);
      setName("");
      setPhone("");
      setMenuItems([]);
      setAdditionalOptions([]);
      setNewAdditionalOption("");
      onSuccess();
    } catch (error) {
      console.error("Error creating restaurant:", error);
      alert(error instanceof Error ? error.message : "建立店家失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>新增店家</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增店家</DialogTitle>
          <DialogDescription>填寫店家資訊並上傳菜單圖片</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">店家名稱</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">電話</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>菜單圖片</Label>
              <MenuImageUpload
                onParseComplete={(items) => {
                  // Convert to MenuItem format with type
                  const formattedItems = items.map(item => ({
                    name: item.name,
                    price: String(item.price),
                    type: item.type || undefined,
                  }));
                  // Sort items by type first, then by price (ascending)
                  const sortedItems = [...formattedItems].sort((a, b) => {
                    // Group by type
                    if (a.type && b.type && a.type !== b.type) {
                      return a.type.localeCompare(b.type);
                    }
                    if (a.type && !b.type) return -1;
                    if (!a.type && b.type) return 1;
                    // Then by price
                    const priceA = parseFloat(a.price) || 0;
                    const priceB = parseFloat(b.price) || 0;
                    return priceA - priceB;
                  });
                  setMenuItems(sortedItems);
                }}
              />
            </div>
            {menuItems.length > 0 && (
              <div className="space-y-2">
                <Label>解析結果（可編輯）</Label>
                <MenuParser items={menuItems} onChange={setMenuItems} />
              </div>
            )}
            <div className="space-y-2">
              <Label>自訂選項（如：辣度、醬汁等）</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="例如：不辣、小辣、中辣、大辣"
                    value={newAdditionalOption}
                    onChange={(e) => setNewAdditionalOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (
                          newAdditionalOption.trim() &&
                          !additionalOptions.includes(newAdditionalOption.trim())
                        ) {
                          setAdditionalOptions([
                            ...additionalOptions,
                            newAdditionalOption.trim(),
                          ]);
                          setNewAdditionalOption("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (
                        newAdditionalOption.trim() &&
                        !additionalOptions.includes(newAdditionalOption.trim())
                      ) {
                        setAdditionalOptions([
                          ...additionalOptions,
                          newAdditionalOption.trim(),
                        ]);
                        setNewAdditionalOption("");
                      }
                    }}
                  >
                    新增
                  </Button>
                </div>
                {additionalOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {additionalOptions.map((option, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm"
                      >
                        <span>{option}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAdditionalOptions(
                              additionalOptions.filter((_, i) => i !== index)
                            );
                          }}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading || !name || !phone}>
              {loading ? "建立中..." : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
