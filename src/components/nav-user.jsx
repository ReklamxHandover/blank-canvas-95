import {
	Avatar,
	AvatarFallback,
} from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { LogOutIcon, ChevronsUpDownIcon } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';

export function NavUser() {
	const { currentUser, logout } = useApp();
	const { t } = useLang();
	if (!currentUser) return null;
	const roleLabel = t(`role_${currentUser.role}`);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<Avatar className="size-8">
						<AvatarFallback>{currentUser.initials}</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-medium">{currentUser.name}</span>
						<span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
					</div>
					<ChevronsUpDownIcon className="ml-auto size-4" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" side="right" className="w-60">
				<DropdownMenuLabel className="flex flex-col gap-0.5">
					<span className="font-medium text-foreground">{currentUser.name}</span>
					{currentUser.email && (
						<span className="text-muted-foreground text-xs font-normal">{currentUser.email}</span>
					)}
					<span className="text-[10px] text-muted-foreground font-normal">{roleLabel}</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer text-destructive"
						onClick={() => logout()}
					>
						<LogOutIcon />
						{t('logout')}
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
