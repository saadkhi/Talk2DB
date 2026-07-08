"use client";

import { useState } from "react";
import {
  IconHome,
  IconTerminal,
  IconBarChart,
  IconSchema,
  IconFileText,
  IconPieChart,
  IconHistory,
  IconBookmark,
  IconSettings,
  IconHelp,
  IconSparkles,
  IconChevronDown,
  IconDatabase,
} from "./icons";

const primaryNav = [
  { label: "Home", href: "#", icon: IconHome },
  { label: "Query Studio", href: "#query-studio", icon: IconTerminal },
  { label: "Data Visualizer", href: "#data-visualizer", icon: IconBarChart },
  { label: "Schema Explorer", href: "#schema-explorer", icon: IconSchema },
  { label: "Report Builder", href: "#report-builder", icon: IconFileText },
  { label: "Data Profiler", href: "#data-profiler", icon: IconPieChart },
];

const secondaryNav = [
  { label: "History", href: "#history", icon: IconHistory },
  { label: "Saved Queries", href: "#saved-queries", icon: IconBookmark },
  { label: "Settings", href: "#settings", icon: IconSettings },
  { label: "Help & Docs", href: "#help", icon: IconHelp },
];

export default function Sidebar() {
  const [active, setActive] = useState("Home");

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">
          <IconDatabase width={18} height={18} />
        </span>
        <span className="sidebar-brand-name">
          Talk2<span className="sidebar-brand-accent">DB</span>
        </span>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {primaryNav.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            className={`sidebar-link${active === label ? " is-active" : ""}`}
            onClick={() => setActive(label)}
            aria-current={active === label ? "page" : undefined}
          >
            <Icon width={18} height={18} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-divider" />

      <nav className="sidebar-nav" aria-label="Secondary">
        {secondaryNav.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            className={`sidebar-link${active === label ? " is-active" : ""}`}
            onClick={() => setActive(label)}
          >
            <Icon width={18} height={18} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="pro-tip">
        <div className="pro-tip-title">
          <IconSparkles width={16} height={16} />
          <span>Pro Tip</span>
        </div>
        <p>
          Ask complex questions in plain English. Talk2DB will generate the
          SQL for you.
        </p>
      </div>

      <button type="button" className="sidebar-user">
        <span className="sidebar-user-avatar">S</span>
        <span className="sidebar-user-info">
          <span className="sidebar-user-name">Saad Ali</span>
          <span className="sidebar-user-email">saadallioffic@gmail.com</span>
        </span>
        <IconChevronDown width={16} height={16} className="sidebar-user-chevron" />
      </button>
    </aside>
  );
}
