import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TeamAnalyticsLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Team Statistics</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-[200px] h-10 bg-muted animate-pulse rounded"></div>
        <div className="w-[300px] h-10 bg-muted animate-pulse rounded"></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
              </CardTitle>
              <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-full bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-center">
                <div className="h-5 w-32 bg-muted animate-pulse rounded mx-auto"></div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="h-6 w-48 bg-muted animate-pulse rounded"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded"></div>
        </CardContent>
      </Card>
    </div>
  )
}
