import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { AppBreadcrumbs } from '@/components/app-breadcrumbs';
import { CustomSidebarTrigger } from '@/components/custom-sidebar-trigger';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { ThemeToggle } from '@/components/theme-toggle';
import { useSidebar } from '@/components/ui/sidebar';
import { Calculator as CalcIcon } from 'lucide-react';
import { toggleCalculator } from '@/components/FloatingCalculator';

const VIEW_TITLE_KEY = {
	dashboard: 'dashboard',
	orders: 'orders',
	completed: 'completedOrders',
	calendar: 'calendar',
	items: 'itemRegister',
	clients: 'clients',
	bin: 'bin',
	activityLog: 'activityLog',
	users: 'users',
	businessSettings: 'businessSettings',
};

export function AppHeader() {
	const { view, currentUser } = useApp();
	const { lang, toggle, t } = useLang();
	const { isMobile } = useSidebar();
	const key = VIEW_TITLE_KEY[view] || 'orders';
	const title =
		view === 'orders' && currentUser?.role === 'designer'
			? t('designerView')
			: view === 'orders' && currentUser?.role === 'producer'
				? t('producerView')
				: t(key);

	const mobileCalendar = isMobile && view === 'calendar';

	useEffect(() => {
		if (mobileCalendar) {
			document.body.classList.add('mobile-calendar-view');
		} else {
			document.body.classList.remove('mobile-calendar-view');
		}
		return () => {
			document.body.classList.remove('mobile-calendar-view');
		};
	}, [mobileCalendar]);

	return (
		<header className={cn('mb-6 flex items-center justify-between gap-2 md:px-2')}>
			<div className="flex items-center gap-3">
				<CustomSidebarTrigger />
				<Separator
					className="mr-2 h-4 data-[orientation=vertical]:self-center"
					orientation="vertical"
				/>
				<AppBreadcrumbs page={{ title }} />
			</div>
			<div className="flex items-center gap-2">
				{mobileCalendar && (
					<button
						type="button"
						onClick={toggleCalculator}
						aria-label="Open calculator"
						className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent transition-colors"
					>
						<CalcIcon className="h-4 w-4" />
					</button>
				)}
				<ThemeToggle />
				<button
					type="button"
					onClick={toggle}
					aria-label="Toggle language"
					className="h-8 px-3 rounded-md border border-border bg-card text-xs font-semibold text-muted-foreground tracking-wider hover:bg-accent transition-colors"
				>
					{lang === 'sv' ? 'EN' : 'SV'}
				</button>
			</div>
		</header>
	);
}
