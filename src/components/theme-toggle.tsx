import { useEffect, useState } from 'react';
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'reklamx-theme';

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	const isDark =
		theme === 'dark' ||
		(theme === 'system' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches);
	root.classList.toggle('dark', isDark);
}

export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>('system');

	useEffect(() => {
		const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) || 'system';
		setTheme(stored);
		applyTheme(stored);

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			const current = (localStorage.getItem(STORAGE_KEY) as Theme | null) || 'system';
			if (current === 'system') applyTheme('system');
		};
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}, []);

	const pick = (next: Theme) => {
		setTheme(next);
		localStorage.setItem(STORAGE_KEY, next);
		applyTheme(next);
	};

	const Icon = theme === 'dark' ? MoonIcon : theme === 'light' ? SunIcon : MonitorIcon;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-accent transition-colors"
				aria-label="Toggle theme"
			>
				<Icon className="h-4 w-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => pick('light')}>
					<SunIcon className="h-4 w-4" /> Light
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => pick('dark')}>
					<MoonIcon className="h-4 w-4" /> Dark
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => pick('system')}>
					<MonitorIcon className="h-4 w-4" /> System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
