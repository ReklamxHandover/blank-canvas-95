import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar';
import {
	LayoutDashboard,
	ClipboardList,
	CheckCircle2,
	Calendar,
	Package,
	ShoppingCart,
	Building2,
	Trash2,
	Activity,
	Users,
	Settings,
	Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { NavUser } from './nav-user.jsx';

export function AppSidebar() {
	const { currentUser, view, setView, setCreateModalOpen } = useApp();
	const { t } = useLang();
	const { state, isMobile, setOpenMobile } = useSidebar();
	const collapsed = state === 'collapsed';
	const handleNavigate = (key) => {
		setView(key);
		if (isMobile) setOpenMobile(false);
	};
	const role = currentUser.role;
	const canSeeBin = role === 'owner' || role === 'staff';
	const canSeeLog = role === 'owner' || role === 'staff';
	const isOwner = role === 'owner';

	const groups = [
		{
			label: t('overview') || 'Översikt',
			items: [
				{ key: 'dashboard', title: t('dashboard'), icon: LayoutDashboard, show: true },
				{
					key: 'orders',
					title: role === 'designer' ? t('designerView') : role === 'producer' ? t('producerView') : t('orders'),
					icon: ClipboardList,
					show: true,
				},
				{ key: 'ongoingOrders', title: t('ongoingOrders'), icon: ShoppingCart, show: role === 'owner' || role === 'staff' },
				{ key: 'completed', title: t('completedOrders'), icon: CheckCircle2, show: canSeeBin },
				{ key: 'calendar', title: t('calendar'), icon: Calendar, show: canSeeBin },
			],
		},
		{
			label: t('registers') || 'Register',
			items: [
				{ key: 'items', title: t('itemRegister'), icon: Package, show: true },
				{ key: 'clients', title: t('clients'), icon: Building2, show: true },
			],
		},
		{
			label: t('admin') || 'Administration',
			items: [
				{ key: 'bin', title: t('bin'), icon: Trash2, show: canSeeBin },
				{ key: 'activityLog', title: t('activityLog'), icon: Activity, show: canSeeLog },
				{ key: 'users', title: t('users'), icon: Users, show: isOwner },
				{ key: 'businessSettings', title: t('businessSettings'), icon: Settings, show: isOwner },
			],
		},
	];

	return (
		<Sidebar collapsible="icon" variant="floating">
			<SidebarHeader className="h-auto justify-center pt-4 pb-2 px-0">
				<SidebarMenuButton
					asChild
					className="h-auto w-full overflow-visible p-0 group-data-[collapsible=icon]:!h-auto group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!p-0"
				>
					<button type="button" onClick={() => handleNavigate('dashboard')} className="flex items-center justify-center w-full p-0">
						{collapsed ? (
							<>
								<img src={`${import.meta.env.BASE_URL}logos/reklamx-x-black.png`} alt="ReklamX" className="mx-auto block size-8 object-contain dark:hidden" />
								<img src={`${import.meta.env.BASE_URL}logos/reklamx-x-white.png`} alt="ReklamX" className="mx-auto hidden size-8 object-contain dark:block" />
							</>
						) : (
							<>
								<img src={`${import.meta.env.BASE_URL}logos/reklamx-black.png`} alt="ReklamX" className="h-[32px] w-auto dark:hidden" />
								<img src={`${import.meta.env.BASE_URL}logos/reklamx-white.png`} alt="ReklamX" className="hidden h-[32px] w-auto dark:block" />
							</>
						)}
					</button>
				</SidebarMenuButton>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								tooltip={t('newOrder')}
								onClick={() => {
									setCreateModalOpen(true);
									if (isMobile) setOpenMobile(false);
								}}
								className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
							>
								<Plus />
								<span>{t('newOrder')}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>
				{groups.map((group) => {
					const visible = group.items.filter((i) => i.show);
					if (!visible.length) return null;
					return (
						<SidebarGroup key={group.label}>
							<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
							<SidebarMenu>
								{visible.map((item) => {
									const Icon = item.icon;
									const active = view === item.key;
									return (
										<SidebarMenuItem key={item.key}>
											<SidebarMenuButton
												isActive={active}
												tooltip={item.title}
												onClick={() => handleNavigate(item.key)}
											>
												<Icon />
												<span>{item.title}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroup>
					);
				})}
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<NavUser />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
