"use client";

import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";

export type RevenueSeriesPoint = {
	week: string;
	amount: number;
};

type Row = { week: string; amount: number; label: string };

const chartConfig = {
	amount: {
		label: "Omsättning",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

function formatWeekLabel(iso: string, lang: "sv" | "en") {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US", {
		day: "numeric",
		month: "short",
	});
}

export function RevenueChart({
	series,
	lang,
}: {
	series: RevenueSeriesPoint[];
	lang: "sv" | "en";
}) {
	const chartUid = useId().replace(/:/g, "");
	const idAreaGradient = `revenue-area-grad-${chartUid}`;

	const rows: Row[] = useMemo(
		() =>
			(series ?? []).map((s) => ({
				week: s.week,
				amount: Number(s.amount) || 0,
				label: formatWeekLabel(s.week, lang),
			})),
		[series, lang]
	);

	const growthPct = useMemo(() => {
		const first = rows[0]?.amount ?? 0;
		const last = rows.at(-1)?.amount ?? first;
		if (!first) return 0;
		return ((last - first) / first) * 100;
	}, [rows]);

	const L = lang === "sv"
		? { title: "Omsättning", footer: "vs första veckan i perioden", empty: "Ingen omsättning ännu" }
		: { title: "Revenue", footer: "vs first week in period", empty: "No revenue yet" };

	return (
		<Card className="overflow-hidden p-0 md:col-span-2 lg:col-span-4 dark:bg-[#1e1e1e]">
			<CardHeader className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
				<CardTitle className="text-balance">{L.title}</CardTitle>
			</CardHeader>
			<CardContent className="p-5 pt-0">
				{rows.length === 0 ? (
					<div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
						{L.empty}
					</div>
				) : (
					<ChartContainer className="aspect-auto h-60 w-full p-0" config={chartConfig}>
						<AreaChart
							accessibilityLayer
							data={[...rows]}
							margin={{ left: 24, right: 8, top: 8, bottom: 0 }}
						>
							<defs>
								<linearGradient id={idAreaGradient} x1="0" x2="0" y1="0" y2="1">
									<stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.2} />
									<stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0} />
								</linearGradient>
							</defs>
							<CartesianGrid horizontal={false} strokeDasharray="2 2" />
							<XAxis
								axisLine={false}
								dataKey="label"
								tickLine={false}
								tickMargin={8}
								minTickGap={16}
							/>
							<ChartTooltip
								content={
									<ChartTooltipContent
										className="min-w-36"
										indicator="line"
										formatter={(value) => `${Number(value).toLocaleString("sv-SE")} kr`}
									/>
								}
							/>
							<Area
								dataKey="amount"
								dot={false}
								fill={`url(#${idAreaGradient})`}
								stroke="var(--color-amount)"
								strokeWidth={2}
								type="monotone"
							/>
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
			<CardFooter className="flex items-center justify-between border-t border-border px-5 py-3 dark:bg-[#1e1e1e]">
				<div className="flex items-center gap-1 text-muted-foreground text-xs">
					<Delta value={growthPct}>
						<DeltaIcon />
						<DeltaValue />
					</Delta>
					<p className="inline-flex text-pretty">{L.footer}</p>
				</div>
			</CardFooter>
		</Card>
	);
}
