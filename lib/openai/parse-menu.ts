import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface MenuItem {
  name: string;
  price: number;
  type?: string | null;
}

export async function parseMenuImage(imageFile: File): Promise<MenuItem[]> {
  try {
    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2", // Supports vision and structured outputs
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that extracts menu items from images. Always return valid JSON in the exact format specified.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this menu image and extract all menu items with their prices and categories.

Return a JSON object with this exact structure:
{
  "menu_items": [
    { "name": "Menu Item Name", "price": 100, "type": "Category" },
    ...
  ]
}

Requirements:
- Extract ALL menu items visible in the image
- Prices must be numbers (e.g., 100, 150, 200)
- Try to identify the category/type for each item (e.g., "水餃", "鍋貼", "湯品", "雞肉", "豬肉", "魚類", "麵類", "小菜", "飲料", etc.)
- If you cannot determine the category from the image, you can leave the "type" field out or set it to null
- Common categories: 水餃, 鍋貼, 湯品, 雞肉, 豬肉, 牛肉, 魚類, 麵類, 小菜, 飲料, 便當, 飯類, 粥類, 其他
- Return only valid JSON, no additional text or markdown formatting`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "menu_items_response",
          description: "Menu items extracted from a menu image",
          schema: {
            type: "object",
            properties: {
              menu_items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the menu item",
                    },
                    price: {
                      type: "number",
                      description:
                        "Price of the menu item as a number (e.g. 100, 200)",
                    },
                    type: {
                      type: ["string", "null"],
                      description:
                        "Category/type of the menu item (e.g. 水餃, 湯品, 雞肉, 豬肉, 麵類, 小菜, 飲料, etc.)",
                    },
                  },
                  required: ["name", "price", "type"],
                  additionalProperties: false,
                },
              },
            },
            required: ["menu_items"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON from response (should be valid JSON now)
    const parsed = JSON.parse(content);

    // Validate structure
    if (!parsed.menu_items || !Array.isArray(parsed.menu_items)) {
      throw new Error("Invalid response structure: menu_items array not found");
    }

    return parsed.menu_items.map((item: any) => ({
      name: String(item.name ?? "").trim(),
      // Ensure price is a number; convert or default to 0
      price:
        typeof item.price === "number" ? item.price : Number(item.price) || 0,
      // Include type if available
      type: item.type ? String(item.type).trim() : undefined,
    }));
  } catch (error) {
    console.error("Error parsing menu image:", error);
    throw new Error(
      `Failed to parse menu: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
