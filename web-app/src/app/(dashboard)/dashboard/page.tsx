export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold tracking-tight">대시보드</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Placeholder for KPI cards */}
        <div className="rounded-xl border bg-card text-card-foreground shadow h-32"></div>
        <div className="rounded-xl border bg-card text-card-foreground shadow h-32"></div>
        <div className="rounded-xl border bg-card text-card-foreground shadow h-32"></div>
        <div className="rounded-xl border bg-card text-card-foreground shadow h-32"></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="rounded-xl border bg-card text-card-foreground shadow lg:col-span-4 h-96"></div>
        <div className="rounded-xl border bg-card text-card-foreground shadow lg:col-span-3 h-96"></div>
      </div>
    </div>
  )
}
