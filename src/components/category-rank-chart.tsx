"use client";

import React from "react";
import { LabelList, Pie, PieChart } from "recharts";
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
} from "@/components/ui/chart";

export type RoleSharePoint = {
	role: "designer" | "staff" | "producer" | string;
	points: number;
	pct: number;
};

export function RoleShareChart({
	shares,
	lang,
}: {
	shares: RoleSharePoint[];
	lang: "sv" | "en";
}) {
	const L = lang === "sv"
		? {
			title: "Veckans arbetsfördelning",
			desc: "Andel poäng per roll denna vecka",
			designer: "Designer",
			staff: "Kundsupport",
			producer: "Producent",
			empty: "Ingen aktivitet denna vecka",
		}
		: {
			title: "This week's workload split",
			desc: "Share of points per role this week",
			designer: "Designer",
			staff: "Support",
			producer: "Producer",
			empty: "No activity this week",
		};

	const labelFor = (role: string) =>
		role === "designer" ? L.designer : role === "staff" ? L.staff : role === "producer" ? L.producer : role;

	const colorFor = (role: string) =>
		role === "designer" ? "var(--chart-1)" : role === "staff" ? "var(--chart-2)" : "var(--chart-3)";

	const { chartConfig, pieData, hasAny } = React.useMemo(() => {
		const chartConfig: ChartConfig = { pct: { label: "%" } };
		const pieData = (shares ?? []).map((s) => {
			const key = `r_${s.role}`;
			const color = colorFor(s.role);
			chartConfig[key] = { label: labelFor(s.role), color };
			return {
				key,
				role: s.role,
				label: labelFor(s.role),
				pct: Number(s.pct) || 0,
				points: Number(s.points) || 0,
				fill: `var(--color-${key})`,
			};
		});
		const hasAny = pieData.some((p) => p.pct > 0 || p.points > 0);
		return { chartConfig, pieData, hasAny };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shares, lang]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{L.title}</CardTitle>
				<CardDescription>{L.desc}</CardDescription>
			</CardHeader>
			<CardContent className="my-auto p-0">
				{!hasAny ? (
					<div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
						{L.empty}
					</div>
				) : (
					<ChartContainer className="aspect-auto h-72 w-full" config={chartConfig}>
						<PieChart accessibilityLayer>
							<Pie
								cornerRadius={4}
								data={pieData}
								dataKey="pct"
								innerRadius={50}
								nameKey="key"
								outerRadius="88%"
								stroke="var(--card)"
								strokeWidth={4}
							>
								<LabelList
									className="fill-background font-medium"
									dataKey="pct"
									fill="currentColor"
									fontWeight={500}
									formatter={(label: unknown) => {
										const n = Number(label);
										return Number.isFinite(n) && n > 0 ? `${n}%` : "";
									}}
									position="inside"
									stroke="none"
								/>
							</Pie>
							<ChartLegend
								content={
									<ChartLegendContent
										className="flex flex-wrap gap-3 pt-2"
										nameKey="key"
									/>
								}
							/>
						</PieChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}
