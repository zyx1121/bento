"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface TopRestaurantItem {
  name: string;
  count: number;
}

interface UserTopItemsProps {
  data: TopRestaurantItem[];
  loading?: boolean;
}

export function UserTopItems({ data, loading }: UserTopItemsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>最常吃的餐點</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>最常吃的餐點</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ul className="space-y-2">
            {data.map((item, index) => (
              <li key={index} className="text-lg">
                <span className="font-medium">{index + 1}.</span>{" "}
                <span>{item.name}</span>{" "}
                <span className="text-muted-foreground">({item.count} 次)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">尚無數據</p>
        )}
      </CardContent>
    </Card>
  );
}
