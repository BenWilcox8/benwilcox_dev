// src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

import './App.css';

function DesktopMainPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-container">
        <PanelGroup direction="horizontal" className="main-group" autoSaveId="layout-h">
          {/* LEFT SIDE */}
          <Panel defaultSize={70} minSize={3} collapsible className="pane left-pane">
            <PanelGroup direction="vertical" autoSaveId="left-v" className="sub-group">
              <Panel defaultSize={60} minSize={20} collapsible className="panel-content">
                <CourseSelector />
              </Panel>
              <PanelResizeHandle className="handle-horizontal" />
              <Panel minSize={20} collapsible className="panel-content">
                <CourseDetails />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="handle-vertical" />

          {/* RIGHT SIDE */}
          <Panel minSize={3} collapsible className="pane right-pane">
            <Header />
            <PanelGroup direction="vertical" autoSaveId="right-v" className="sub-group-right">
              <Panel defaultSize={50} minSize={15} collapsible className="panel-content">
                <CourseDisplay1 />
              </Panel>
              <PanelResizeHandle className="handle-horizontal" />
              <Panel minSize={15} collapsible className="panel-content">
                <CourseDisplay2 />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </DndProvider>
  );
}

function App() {
  const { dbLoading, loadingProgress, loadingMessage } = useContext(AppContext);
  const isMobile = useIsMobile(900);

  if (dbLoading) {
    return (
      <div className="loading-container">
        <h1>Loading Database...</h1>
        <p>This may take a few seconds.</p>
        <ProgressBar progress={loadingProgress} message={loadingMessage} />
      </div>
    );
  }

  return (
    <Router>
      <Analytics />
      <SpeedInsights />
      <Routes>
        <Route path="/" element={isMobile ? <MobileMainPage /> : <DesktopMainPage />} />
        <Route path="/info" element={<InfoPage />} />
      </Routes>
    </Router>
  );
}

export default App;