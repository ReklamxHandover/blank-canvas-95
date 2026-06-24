"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

export type WeeklyPointsPoint = {
	week: string;
	designer: number;
	staff: number;
	producer: number;
};

function formatWeekLabel(iso: string, lang: "sv" | "en") {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(lang === "sv" ? "sv-SE" : "en-US", {
		day: "numeric",
		month: "short",
	});
}

export function WeeklyPointsChart({
	points,
	lang,
}: {
	points: WeeklyPointsPoint[];
	lang: "sv" | "en";
}) {
	const L = lang === "sv"
		? {
			title: "Veckopoäng per roll",
			desc: "Senaste 8 veckorna",
			designer: "Designer",
			staff: "Kundsupport",
			producer: "Producent",
			empty: "Ingen aktivitet ännu",
		}
		: {
			title: "Weekly points per role",
			desc: "Last 8 weeks",
			designer: "Designer",
			staff: "Support",
			producer: "Producer",
			empty: "No activity yet",
		};

	const chartConfig: ChartConfig = {
		designer: { label: L.designer, color: "var(--chart-1)" },
		staff: { label: L.staff, color: "var(--chart-2)" },
		producer: { label: L.producer, color: "var(--chart-3)" },
	};

	const data = useMemo(
		() =>
			(points ?? []).map((p) => ({
				...p,
				label: formatWeekLabel(p.week, lang),
			})),
		[points, lang]
	);

	const hasAny = data.some((d) => d.designer || d.staff || d.producer);

	return (
		<Card className="overflow-hidden p-0 md:col-span-2">
			<CardHeader className="flex flex-col p-5">
				<div className="space-y-1">
					<CardTitle>{L.title}</CardTitle>
					<CardDescription>{L.desc}</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="mt-auto p-5 pt-0">
				{!hasAny ? (
					<div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
						{L.empty}
					</div>
				) : (
					<ChartContainer className="aspect-auto h-56 w-full" config={chartConfig}>
						<BarChart
							accessibilityLayer
							data={data}
							margin={{ left: 12, right: 12, top: 12, bottom: 0 }}
						>
							<CartesianGrid horizontal strokeDasharray="3 3" />
							<XAxis
								axisLine={false}
								dataKey="label"
								tickLine={false}
								tickMargin={8}
								minTickGap={8}
							/>
							<YAxis hide />
							<ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
							<ChartLegend content={<ChartLegendContent />} />
							<Bar dataKey="designer" fill="var(--color-designer)" radius={[4, 4, 0, 0]} />
							<Bar dataKey="staff" fill="var(--color-staff)" radius={[4, 4, 0, 0]} />
							<Bar dataKey="producer" fill="var(--color-producer)" radius={[4, 4, 0, 0]} />
						</BarChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
