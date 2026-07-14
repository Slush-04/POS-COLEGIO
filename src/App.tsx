import { useState } from 'react';
import { Topbar } from './components/Topbar';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { POSView } from './components/POSView';
import { CoursesView } from './components/Panel_Cursos/CoursesView';
import { DeudasView } from './components/Panel_Deudas/DeudasView';
import { SettingsView } from './components/SettingsView';
import { CuotasView } from './components/Panel_de_Cuotas/CuotasView';
import { TransactionHistoryView } from './historial/TransHistory_View';

export default function App() {
  const [currentView, setCurrentView] = useState('settings');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentView} />;
      case 'transactions':
        return <TransactionHistoryView />;
      case 'clients':
        return <ClientsView />;
      case 'pos':
        return <POSView />;
      case 'courses':
        return <CoursesView />;
      case 'ar':
        return <DeudasView />;
      case 'cuotas':
        return <CuotasView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <p>Módulo en construcción: {currentView}</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-bg-app font-sans text-text-main overflow-hidden">
      <Topbar currentView={currentView} onNavigate={setCurrentView} />

      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
}
