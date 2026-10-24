import JourneySurface, { JourneyLaunchpad } from './JourneyShell';
import LearningLab from './LearningLab';
import WorkspaceApp from './WorkspaceApp';
import { stripDeploymentBasePath } from './base-path';
import './journey-shell.css';

function isJourneyPath(pathname: string) {
  return pathname.startsWith('/diagnostics/') || pathname === '/report' || pathname === '/capstone';
}

function PersonalAlphaNotice() {
  return (
    <aside className="personal-alpha-notice" role="note" aria-label="Personal alpha status">
      <strong>ReviewLab personal alpha</strong>
      <span>Learn production .NET by reviewing and correcting realistic AI-generated code, using TypeScript experience as a bridge.</span>
    </aside>
  );
}

export default function App() {
  const pathname = stripDeploymentBasePath(window.location.pathname, import.meta.env.BASE_URL) ?? '/';

  if (pathname === '/learning-lab') return <LearningLab />;

  if (isJourneyPath(pathname)) {
    return (
      <>
        <PersonalAlphaNotice />
        <JourneySurface pathname={pathname} />
      </>
    );
  }

  return (
    <>
      <PersonalAlphaNotice />
      <div className="journey-launchpad-host"><section className="page"><a className="primary-button" href={`${import.meta.env.BASE_URL}learning-lab`}>Open DotNet Learning Lab →</a></section></div>
      {pathname === '/' && <div className="journey-launchpad-host"><JourneyLaunchpad /></div>}
      <WorkspaceApp />
    </>
  );
}
