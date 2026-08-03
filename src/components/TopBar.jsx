import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Badge({ label, count, tone }) {
  if (count === 0) return null;
  const toneClasses = {
    warning: 'bg-warning/15 border-warning/30 [&_.dot]:bg-warning [&_.num]:text-warning [&_.num]:bg-warning/20',
    destructive: 'bg-destructive/15 border-destructive/30 [&_.dot]:bg-destructive [&_.num]:text-destructive [&_.num]:bg-destructive/20',
    info: 'bg-info/15 border-info/30 [&_.dot]:bg-info [&_.num]:text-info [&_.num]:bg-info/20',
  };
  return (
    <div className={cn('flex items-center gap-1.5 px-3 py-[5px] rounded-full border', toneClasses[tone])}>
      <span className="dot w-2 h-2 rounded-full shrink-0" />
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="num text-xs font-bold rounded-[10px] px-[7px] py-px">{count}</span>
    </div>
  );
}

export default function TopBar() {
  const { currentUser, logout, orders } = useApp();
  const { lang, toggle, t } = useLang();

  const activeOrders = orders.filter(o => !o.deletedAt);
  const waitingPriceCount = activeOrders.filter(o => o.price === null).length;
  const needsAttentionCount = activeOrders.filter(o => o.needsAttention).length;
  const activeProductionCount = activeOrders.filter(o =>
    o.pipeline.produktion.status === 'active'
  ).length;

  const showBadges = currentUser.role === 'owner' || currentUser.role === 'staff';

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-7 gap-4 shrink-0 z-10">
      {/* Logo */}
      <div className="shrink-0">
        <img src={`${import.meta.env.BASE_URL}ReklamX_Logo.png`} alt="ReklamX" className="h-9 block" />
      </div>

      {/* Center badges */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {showBadges && (
          <>
            <Badge label={t('waitingPrice')} count={waitingPriceCount} tone="warning" />
            <Badge label={t('needsAttention')} count={needsAttentionCount} tone="destructive" />
            <Badge label={t('activeProduction')} count={activeProductionCount} tone="info" />
          </>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Language toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          aria-label="Toggle language"
          className="h-8 px-3 text-xs font-semibold text-muted-foreground tracking-wider"
        >
          {lang === 'sv' ? 'EN' : 'SV'}
        </Button>

        {/* User avatar + info */}
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
            {currentUser.initials}
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-foreground">
              {currentUser.name}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {t(`role_${currentUser.role}`)}
            </div>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          title={t('logout')}
          className="h-8 gap-1.5 text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
        >
          <LogOut size={14} strokeWidth={2} />
          <span>{t('logout')}</span>
        </Button>
      </div>
    </header>
  );
}
