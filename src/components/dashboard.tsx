import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// @ts-expect-error - JS module without types
import { useLang } from "@/context/LanguageContext.jsx";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { DashboardStats, type DashboardCards } from "@/components/stats";
import { RevenueChart, type RevenueSeriesPoint } from "@/components/revenue-chart";
import { WeeklyPointsChart, type WeeklyPointsPoint } from "@/components/refund-return-rate-chart";
import { RoleShareChart, type RoleSharePoint } from "@/components/category-rank-chart";

export type DashboardStatsResult = {
	cards: DashboardCards;
	revenue_series: RevenueSeriesPoint[];
	weekly_points: WeeklyPointsPoint[];
	role_share_week: RoleSharePoint[];
};

export function Dashboard() {
	const { lang } = useLang();
	const [data, setData] = useState<DashboardStatsResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		const { data, error } = await supabase.rpc("get_dashboard_stats");
		if (error) {
			setError(error.message);
		} else {
			setData(data as DashboardStatsResult);
		}
		setLoading(false);
	}, []);

	// Re-fetch every time the dashboard view is opened (component mounts).
	useEffect(() => {
		load();
	}, [load]);

	const L = lang === "sv"
		? { refresh: "Uppdatera", loading: "Laddar…", error: "Kunde inte ladda data" }
		: { refresh: "Refresh", loading: "Loading…", error: "Couldn't load data" };

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-end">
				<Button onClick={load} variant="outline" size="sm" disabled={loading}>
					<RefreshCw className={loading ? "animate-spin" : ""} />
					{L.refresh}
				</Button>
			</div>

			{error && (
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{L.error}: {error}
				</div>
			)}

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<DashboardStats cards={data?.cards} lang={lang} />
				<RevenueChart series={data?.revenue_series ?? []} lang={lang} />
				<WeeklyPointsChart points={data?.weekly_points ?? []} lang={lang} />
				<RoleShareChart shares={data?.role_share_week ?? []} lang={lang} />
			</div>
		</div>
	);
}
