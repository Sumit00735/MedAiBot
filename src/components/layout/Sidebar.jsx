'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ScanLine,
  Database,
  Pill,
  Menu,
  X,
  Smartphone,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Scan', icon: ScanLine },
  { href: '/data', label: 'Saved Data', icon: Database },
];

export default function Sidebar({ open, onClose, localIp, savedDates = [] }) {
  const pathname = usePathname();

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Pill size={28} className="brand-icon" />
            <div>
              <h2>MedScan AI</h2>
              <span className="brand-sub">Medicine OCR Agent</span>
            </div>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href ? 'nav-link-active' : ''}`}
              onClick={onClose}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {savedDates.length > 0 && (
          <div className="sidebar-section">
            <h4>Recent Dates</h4>
            <ul className="date-list">
              {savedDates.slice(0, 5).map((date) => (
                <li key={date}>
                  <Link href={`/data?date=${date}`} onClick={onClose}>
                    {date}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {localIp && (
          <div className="sidebar-mobile-tip">
            <Smartphone size={16} />
            <div>
              <strong>Phone camera</strong>
              <p>
                Open <code>http://{localIp}:3000</code> on same WiFi
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export function SidebarToggle({ onClick }) {
  return (
    <button className="sidebar-toggle" onClick={onClick} aria-label="Open menu">
      <Menu size={22} />
    </button>
  );
}
