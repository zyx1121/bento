'use client'

import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface UserOrderCountProps {
  value: number
  loading?: boolean
}

export function UserOrderCount({ value, loading }: UserOrderCountProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>參與訂單數</CardTitle>
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
        <CardTitle>參與訂單數</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}
