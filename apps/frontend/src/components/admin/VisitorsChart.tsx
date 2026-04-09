import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi, type ActivityStat } from '@/api/admin';

const chartConfig = {
  registrations: {
    label: 'New Users',
    color: 'var(--chart-1)',
  },
  actions: {
    label: 'Actions',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

function buildChartData(
  registrations: ActivityStat[],
  actions: ActivityStat[],
  days: number,
): { date: string; registrations: number; actions: number }[] {
  const map = new Map<string, { registrations: number; actions: number }>();

  const end = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { registrations: 0, actions: 0 });
  }

  registrations.forEach(({ date, count }) => {
    const entry = map.get(date);
    if (entry) entry.registrations = count;
  });
  actions.forEach(({ date, count }) => {
    const entry = map.get(date);
    if (entry) entry.actions = count;
  });

  return Array.from(map.entries()).map(([date, vals]) => ({ date, ...vals }));
}

export function VisitorsChart() {
  const [timeRange, setTimeRange] = React.useState('30d');
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  const { data } = useQuery({
    queryKey: ['admin', 'activity', days],
    queryFn: () => adminApi.getActivityStats(days),
  });

  const chartData = React.useMemo(() => {
    const registrations = data?.data.registrations ?? [];
    const actions = data?.data.actions ?? [];
    return buildChartData(registrations, actions, days);
  }, [data, days]);

  return (
    <Card>
      <CardHeader className="flex items-center sm:gap-2 gap-4 space-y-0 sm:flex-row flex-col">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Platform Activity</CardTitle>
          <CardDescription>New user registrations and actions over time</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px] sm:ml-auto" aria-label="Select time range">
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="90d">Last 3 months</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="registrations"
              type="natural"
              fill="var(--color-registrations)"
              stroke="var(--color-registrations)"
              stackId="a"
            />
            <Area
              dataKey="actions"
              type="natural"
              fill="var(--color-actions)"
              stroke="var(--color-actions)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
