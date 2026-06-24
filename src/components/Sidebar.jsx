import { useApp } from '../context/AppContext.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { ClipboardList, Trash2, Activity, Users, CheckCircle2, Calendar, Package, Building2, Settings, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_LEGEND = [
  { className: 'bg-muted border-border', labelKey: 'statusNotStarted' },
  { className: 'bg-info border-info', labelKey: 'statusActive' },
  { className: 'bg-success border-success', labelKey: 'statusDone' },
  { className: 'bg-warning border-warning', labelKey: 'statusAttention' },
  { className: 'bg-destructive border-destructive', labelKey: 'statusDeclined' },
];

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 w-full text-left px-4 py-2.5 rounded-[10px] text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
          : 'bg-transparent text-muted-foreground font-medium hover:bg-sidebar-accent/60 hover:text-foreground'
      )}
    >
      <Icon size={16} strokeWidth={active ? 2 : 1.75} />
      {label}
    </button>
  );
}

export default function Sidebar() {
  const { currentUser, view, setView } = useApp();
  const { t } = useLang();
  const role = currentUser.role;

  const canSeeBin = role === 'owner' || role === 'staff';
  const canSeeLog = role === 'owner' || role === 'staff';

  return (
    <aside className="w-[220px] bg-sidebar border-r border-sidebar-border flex flex-col px-3 py-5 shrink-0 overflow-y-auto">
      {/* Navigation */}
      <nav className="flex-1">
        <div className="mb-1 flex flex-col gap-0.5">
          <NavItem
            icon={LayoutDashboard}
            label={t('dashboard')}
            active={view === 'dashboard'}
            onClick={() => setView('dashboard')}
          />
          <NavItem
            icon={ClipboardList}
            label={role === 'designer' ? t('designerView') : role === 'producer' ? t('producerView') : t('orders')}
            active={view === 'orders'}
            onClick={() => setView('orders')}
          />
          {canSeeBin && (
            <NavItem
              icon={CheckCircle2}
              label={t('completedOrders')}
              active={view === 'completed'}
              onClick={() => setView('completed')}
            />
          )}
          {canSeeBin && (
            <NavItem
              icon={Calendar}
              label={t('calendar')}
              active={view === 'calendar'}
              onClick={() => setView('calendar')}
            />
          )}
          <NavItem
            icon={Package}
            label={t('itemRegister')}
            active={view === 'items'}
            onClick={() => setView('items')}
          />
          <NavItem
            icon={Building2}
            label={t('clients')}
            active={view === 'clients'}
            onClick={() => setView('clients')}
          />
          {canSeeBin && (
            <NavItem
              icon={Trash2}
              label={t('bin')}
              active={view === 'bin'}
              onClick={() => setView('bin')}
            />
          )}
          {canSeeLog && (
            <NavItem
              icon={Activity}
              label={t('activityLog')}
              active={view === 'activityLog'}
              onClick={() => setView('activityLog')}
            />
          )}
          {role === 'owner' && (
            <NavItem
              icon={Users}
              label={t('users')}
              active={view === 'users'}
              onClick={() => setView('users')}
            />
          )}
          {role === 'owner' && (
            <NavItem
              icon={Settings}
              label={t('businessSettings')}
              active={view === 'businessSettings'}
              onClick={() => setView('businessSettings')}
            />
          )}
        </div>
      </nav>

      {/* Status legend */}
      <div className="border-t border-sidebar-border pt-4 mt-2 mb-3">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-2.5">
          {t('statusColors')}
        </div>
        <div className="flex flex-col gap-[7px]">
          {STATUS_LEGEND.map(({ className, labelKey }) => (
            <div key={labelKey} className="flex items-center gap-2.5">
              <div className={cn('w-2.5 h-2.5 rounded-full border-[1.5px] shrink-0', className)} />
              <span className="text-xs text-muted-foreground font-normal">
                {t(labelKey)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* User info */}
      <div className="border-t border-sidebar-border pt-3.5">
        <div className="text-[13px] font-semibold text-foreground mb-0.5">
          {currentUser.name}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {t('accessLevel')}: {t(`role_${currentUser.role}`)}
        </div>
      </div>
    </aside>
  );
}
