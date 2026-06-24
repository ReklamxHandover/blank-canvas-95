import { useApp } from './context/AppContext.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import MainLayout from './components/MainLayout.jsx';

export default function App() {
  const { currentUser } = useApp();
  return currentUser ? <MainLayout /> : <LoginScreen />;
}
