import JourneySurface, { JourneyLaunchpad } from './JourneyShell';
import WorkspaceApp from './WorkspaceApp';
import { stripDeploymentBasePath } from './base-path';
import './journey-shell.css';

function isJourneyPath(pathname: string) {
  return pathname.startsWith('/diagnostics/') || pathname === '/report' || pathname === '/capstone';
}

export default function App() {
  const pathname = stripDeploymentBasePath(window.location.pathname, import.meta.env.BASE_URL) ?? '/';

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
