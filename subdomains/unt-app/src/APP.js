// src/App.js
import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { AppContext } from './contexts/AppContext';
import useIsMobile from './hooks/useIsMobile';

import Header from './components/shared/Header';
import ProgressBar from './components/shared/ProgressBar';
import CourseSelector from './components/CourseSelector/CourseSelector';
import CourseDisplay1 from './components/CourseDisplay1/CourseDisplay1';
import CourseDisplay2 from './components/CourseDisplay2/CourseDisplay2';
import CourseDetails from './components/CourseDetails/CourseDetails';
import InfoPage from './pages/InfoPage';
import MobileMainPage from './components/MobileMainPage';
import TutorialProvider from './tutorial/TutorialProvider';

import './App.css';

// react-resizable-panels saves a dragged layout under each `autoSaveId` and
// restores it on the next visit, which would hide any new default from anyone
// who has already used the app. The suffix is bumped whenever the defaults
// below change, so every visitor sees the new layout once and their own drags
// persist again from there.
const LAYOUT_VERSION = 'v3';

function DesktopMainPage() {
  return (
    <TutorialProvider>
    <DndProvider backend={HTML5Backend}>
      <div className="app-container">
        <PanelGroup direction="horizontal" className="main-group" autoSaveId={`layout-h-${LAYOUT_VERSION}`}>
          {/* LEFT SIDE */}
          <Panel defaultSize={33} minSize={3} collapsible className="pane left-pane">
            <PanelGroup direction="vertical" autoSaveId={`left-v-${LAYOUT_VERSION}`} className="sub-group">
              <Panel defaultSize={60} minSize={20} collapsible className="panel-content">
                <CourseSelector />
              </Panel>
              <PanelResizeHandle className="handle-horizontal" />
              <Panel defaultSize={40} minSize={20} collapsible className="panel-content">
                <CourseDetails />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="handle-vertical" />

          {/* RIGHT SIDE */}
          <Panel minSize={3} collapsible className="pane right-pane">
            <Header />
            <PanelGroup direction="vertical" autoSaveId={`right-v-${LAYOUT_VERSION}`} className="sub-group-right">
              <Panel defaultSize={67} minSize={15} collapsible className="panel-content">
                <CourseDisplay1 />
              </Panel>
              <PanelResizeHandle className="handle-horizontal" />
              <Panel defaultSize={33} minSize={15} collapsible className="panel-content">
                <CourseDisplay2 />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </DndProvider>
    </TutorialProvider>
  );
}

function LoadingScreen() {
  const { loadingProgress, loadingMessage } = useContext(AppContext);
  return (
    <div className="loading-container">
      <h1>Loading Database...</h1>
      <p>This may take a few seconds.</p>
      <ProgressBar progress={loadingProgress} message={loadingMessage} />
      <p className="loading-wait-link">
        Read the <Link to="/info">Information/Data page</Link> while you wait
      </p>
    </div>
  );
}

// The gate belongs to the main page, not to the site. The database is what
// the main page is made of, so it waits for it; the information page is
// writing about the database and needs nothing from it, and is readable while
// the download is still running.
function MainPage({ isMobile }) {
  const { appLoading, requestDatabase, dbError } = useContext(AppContext);

  // The database is downloaded for this page and no other, so this page is
  // what asks for it. A tab opened on /info never mounts this and so never
  // pulls the 87MB down.
  useEffect(() => { requestDatabase(); }, [requestDatabase]);

  // The wait is over when the app can be used, not when the download lands:
  // the courses and the search index come after it, and until they are there
  // the page is an empty shell. A failed download drops through to the app
  // rather than leaving this up for ever.
  if (appLoading && !dbError) return <LoadingScreen />;

  return isMobile ? <MobileMainPage /> : <DesktopMainPage />;
}

function App() {
  const isMobile = useIsMobile(900);

  // The download is held by the provider above this router and is untouched by
  // anything below it, so moving between these two routes neither interrupts
  // nor restarts it. Only the main page asks for it, so a tab that opens
  // straight onto /info reads the page and downloads nothing.
  return (
    <Router>
      <Analytics />
      <SpeedInsights />
      <Routes>
        <Route path="/" element={<MainPage isMobile={isMobile} />} />
        <Route path="/info" element={<InfoPage />} />
      </Routes>
    </Router>
  );
}

export default App;