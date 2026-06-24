import { useApp } from '../context/AppContext.jsx';
import OrdersPage from './OrdersPage.jsx';
import BinView from './BinView.jsx';
import CompletedOrdersPage from './CompletedOrdersPage.jsx';
import ActivityLogPage from './ActivityLogPage.jsx';
import ActivityPanel from './ActivityPanel.jsx';
import OrderDrawer from './OrderDrawer.jsx';
import CreateOrderModal from './CreateOrderModal.jsx';
import UserManagement from './UserManagement.jsx';
import CalendarView from './CalendarView.jsx';
// TasksView removed — Calendar task panel replaces it
import ArtikelregisterView from './ArtikelregisterView.jsx';
import ClientsView from './ClientsView.jsx';
import ClientProfileModal from './ClientProfileModal.jsx';
import BusinessSettingsView from './BusinessSettingsView.jsx';
import NotificationCenter from './NotificationCenter.jsx';
import { Dashboard } from './dashboard.tsx';
import { AppShell } from './app-shell.jsx';

export default function MainLayout() {
  const { currentUser, view, selectedOrderId, createModalOpen, selectedClientId } = useApp();
  const isOwner = currentUser.role === 'owner';

  const renderView = () => {
    switch (view) {
      case 'dashboard': return <Dashboard />;
      case 'bin': return <BinView />;
      case 'ongoingOrders': return <OrdersPage scope="orders" />;
      case 'completed': return <CompletedOrdersPage />;
      case 'activityLog': return <ActivityLogPage />;
      case 'calendar': return <CalendarView />;
      case 'tasks': return <CalendarView />;
      case 'items': return <ArtikelregisterView />;
      case 'clients': return <ClientsView />;
      case 'businessSettings': return isOwner ? <BusinessSettingsView /> : <OrdersPage />;
      case 'users': return isOwner ? <UserManagement /> : <OrdersPage />;
      default: return <OrdersPage scope="offers" />;
    }
  };

  return (
    <>
      <AppShell>
        {renderView()}
      </AppShell>

      {/* Order drawer */}
      {selectedOrderId && <OrderDrawer />}

      {/* Client profile modal */}
      {selectedClientId && <ClientProfileModal />}

      {/* Create order modal */}
      {createModalOpen && <CreateOrderModal />}

      {/* Global in-app notification poller */}
      <NotificationCenter />
    </>
  );
}
