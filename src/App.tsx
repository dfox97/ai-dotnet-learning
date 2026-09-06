import JourneySurface, { JourneyLaunchpad } from './JourneyShell';
import WorkspaceApp from './WorkspaceApp';
import './journey-shell.css';

function isJourneyPath(pathname: string) {
  return pathname.startsWith('/diagnostics/') || pathname === '/report' || pathname === '/capstone';
}

export default function App() {
  const pathname = window.location.pathname;

  if (isJourneyPath(pathname)) {
    return <JourneySurface pathname={pathname} />;
  }

  return (
    <>
      {pathname === '/' && <div className="journey-launchpad-host"><JourneyLaunchpad /></div>}
      <WorkspaceApp />
    </>
  );
}
