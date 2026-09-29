import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNavDrawer } from './MobileNavDrawer';
import { SimulatorDock } from './SimulatorDock';
import { ErrorBoundary } from '../shared/ErrorBoundary';

export const AppLayout: React.FC = () => {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-soc-bg flex flex-col transition-colors">
      {/* Top Navigation */}
      <Navbar
        onToggleSimulator={() => setIsSimulatorOpen(prev => !prev)}
        isSimulatorOpen={isSimulatorOpen}
        onToggleMobileNav={() => setIsMobileNavOpen(true)}
      />

      {/* Main Body Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Persistent Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Navigation Drawer */}
        <MobileNavDrawer
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
        />

        {/* Main Content Viewport */}
        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-gradient-to-b from-soc-bg to-soc-surface/30"
        >
          <div className="max-w-7xl mx-auto pb-16">
            <ErrorBoundary fallbackTitle="View Rendering Error">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Real-time Simulator Drawer Dock */}
      <SimulatorDock
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
    </div>
  );
};
