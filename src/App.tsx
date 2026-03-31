import { Layout } from './components/Layout';
import { Board } from './components/Board';
import { Projects } from './components/Projects';
import { Dashboard } from './components/Dashboard';
import { Backlog } from './components/Backlog';
import { Sprints } from './components/Sprints';
import { Tagesaufgaben } from './components/Tagesaufgaben';
import { DailyLog } from './components/DailyLog';
import { Export } from './components/Export';
import { Settings } from './components/Settings';
import { About } from './components/About';
import { GdriveAutoSync } from './components/GdriveAutoSync';
import { useStore } from './store/useStore';

function App() {
  const currentView = useStore((s) => s.currentView);

  return (
    <Layout>
      <GdriveAutoSync />
      {currentView === 'projects' && <Projects />}
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'board' && <Board />}
      {currentView === 'backlog' && <Backlog />}
      {currentView === 'sprints' && <Sprints />}
      {currentView === 'tagesaufgaben' && <Tagesaufgaben />}
      {currentView === 'daily-log' && <DailyLog />}
      {currentView === 'export' && <Export />}
      {currentView === 'settings' && <Settings />}
      {currentView === 'about' && <About />}
    </Layout>
  );
}

export default App;
