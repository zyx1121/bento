'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface UserTotalSpendingProps {
  value: number
  loading?: boolean
}

export function UserTotalSpending({ value, loading }: UserTotalSpendingProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>總計消費</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>總計消費</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">NT$ {value.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}
