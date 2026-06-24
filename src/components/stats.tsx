import { ArrowDown, ArrowUp } from "lucide-react";

export type DashboardCard = {
	value: number;
	delta: number | null;
};

export type DashboardCards = {
	revenue: DashboardCard;
	new_offers: DashboardCard;
	productive_changes: DashboardCard;
	overdue: DashboardCard;
};

type CardKey = keyof DashboardCards;

const LABELS: Record<"sv" | "en", Record<CardKey, string>> = {
	sv: {
		revenue: "Omsättning",
		new_offers: "Nya offerter",
		productive_changes: "Produktiva Ändringar",
		overdue: "Försenade offerter",
	},
	en: {
		revenue: "Revenue",
		new_offers: "New offers",
		productive_changes: "Productive changes",
		overdue: "Overdue offers",
	},
};

const HINT: Record<"sv" | "en", string> = {
	sv: "vs föregående 30 dagar",
	en: "vs previous 30 days",
};

function formatSek(value: number) {
	return `${Math.round(value).toLocaleString("sv-SE")} kr`;
}

function formatCount(value: number) {
	return Number(value || 0).toLocaleString("sv-SE");
}

export function DashboardStats({
	cards,
	lang,
}: {
	cards: DashboardCards | undefined;
	lang: "sv" | "en";
}) {
	const order: CardKey[] = ["revenue", "new_offers", "productive_changes", "overdue"];
	const isMoney = (k: CardKey) => k === "revenue";

	return (
		<>
			{order.map((key) => {
				const card = cards?.[key];
				const value = card?.value ?? 0;
				const display = isMoney(key) ? formatSek(value) : formatCount(value);
				return (
					<StatCard
						key={key}
						label={LABELS[lang][key]}
						value={display}
						delta={card?.delta ?? null}
						hint={HINT[lang]}
					/>
				);
			})}
		</>
	);
}

function StatCard({
	label,
	value,
	delta,
	hint,
}: {
	label: string;
	value: string;
	delta: number | null;
	hint: string;
}) {
	const positive = typeof delta === "number" && delta > 0;
	const negative = typeof delta === "number" && delta < 0;
	const color = positive
		? "text-emerald-600 dark:text-emerald-400"
		: negative
			? "text-rose-600 dark:text-rose-400"
			: "text-muted-foreground";
	const Icon = positive ? ArrowUp : negative ? ArrowDown : null;

	return (
		<div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
			<div className="p-5">
				<div className="text-xs font-normal text-muted-foreground">{label}</div>
				<p className="mt-3 text-balance text-3xl font-semibold tabular-nums tracking-tight text-foreground">
					{value}
				</p>
			</div>
			<div
				className="flex items-center gap-1.5 border-t border-border px-5 py-3 text-xs"
				style={{ backgroundColor: "var(--stat-footer, #f9f9f9)" }}
			>
				{delta === null || delta === undefined ? (
					<span className="text-muted-foreground">—</span>
				) : (
					<span className={`inline-flex items-center gap-1 tabular-nums ${color}`}>
						{Icon && <Icon className="size-3" />}
						{Math.abs(delta).toFixed(1)}%
					</span>
				)}
				<span className="text-pretty text-muted-foreground">{hint}</span>
			</div>
		</div>
	);
}
