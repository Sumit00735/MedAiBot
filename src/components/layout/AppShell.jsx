'use client';

import { useEffect, useState } from 'react';
import Sidebar, { SidebarToggle } from './Sidebar';

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [localIp, setLocalIp] = useState('');
  const [savedDates, setSavedDates] = useState([]);

  useEffect(() => {
    fetch('/api/network')
      .then((res) => res.json())
      .then((data) => {
        if (data.ip && data.ip !== 'localhost') setLocalIp(data.ip);
      })
      .catch(() => {});

    fetch('/api/records')
      .then((res) => res.json())
      .then((data) => {
        if (data.dates) setSavedDates(data.dates);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        localIp={localIp}
        savedDates={savedDates}
      />
      <div className="app-main">
        <header className="app-header">
          <SidebarToggle onClick={() => setSidebarOpen(true)} />
          <div className="header-title">
            <span className="header-badge">Local AI Agent</span>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
