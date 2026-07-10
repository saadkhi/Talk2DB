import Sidebar from "../components/Sidebar";
import HeroVisual from "../components/HeroVisual";
import FeatureCard from "../components/FeatureCard";
import {
  IconStar,
  IconSun,
  IconArrowRight,
  IconTerminal,
  IconBarChart,
  IconSchema,
  IconFileText,
  IconPieChart,
  IconShield,
  IconElephant,
  IconSparkles,
  IconZap,
  IconDatabase,
} from "../components/icons";

const features = [
  {
    icon: IconTerminal,
    tone: "violet" as const,
    title: "Query Studio",
    description:
      "Write or generate SQL in plain English. Instant, secure execution.",
    href: "#query-studio",
  },
  {
    icon: IconBarChart,
    tone: "blue" as const,
    title: "Data Visualizer",
    description: "Turn your data into beautiful charts and dashboards.",
    href: "#data-visualizer",
  },
  {
    icon: IconSchema,
    tone: "amber" as const,
    title: "Schema Explorer",
    description:
      "Explore tables, columns, relationships with an interactive tree.",
    href: "#schema-explorer",
  },
  {
    icon: IconFileText,
    tone: "teal" as const,
    title: "Report Builder",
    description:
      "Create insightful reports and executive summaries in one click.",
    href: "#report-builder",
  },
  {
    icon: IconPieChart,
    tone: "pink" as const,
    title: "Data Profiler",
    description:
      "Analyze data quality, detect anomalies and column insights.",
    href: "#data-profiler",
  },
];

const trustPoints = [
  {
    icon: IconShield,
    title: "Secure & Private",
    description: "Your data stays private and secure.",
  },
  {
    icon: IconElephant,
    title: "PostgreSQL Ready",
    description: "Optimized for PostgreSQL databases.",
  },
  {
    icon: IconSparkles,
    title: "AI-Powered",
    description: "Advanced AI models for accurate SQL generation.",
  },
  {
    icon: IconZap,
    title: "Real-time Results",
    description: "Get results and insights in real-time.",
  },
];

export default function Home() {
  return (
    <div className="shell">
      <Sidebar />

      <main className="main">
        <div className="starfield" aria-hidden="true" />

        <header className="topbar">
          <a
            className="btn btn--ghost btn--sm"
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
          >
            <IconStar width={16} height={16} />
            Star on GitHub
          </a>
          <button type="button" className="icon-btn" aria-label="Toggle theme">
            <IconSun width={18} height={18} />
          </button>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">AI-POWERED SQL ASSISTANT</span>
            <h1>
              Chat with your
              <br />
              Database. <span className="hero-gradient-text">Naturally.</span>
            </h1>
            <p className="hero-sub">
              Ask questions, generate SQL, visualize results, and build
              reports — all in one place.
            </p>
            <div className="hero-actions">
              <a href="#query-studio" className="btn btn--primary">
                Start Asking
                <IconArrowRight width={16} height={16} />
              </a>
              <a href="#features" className="btn btn--outline">
                Explore Features
              </a>
            </div>
          </div>

          <HeroVisual />
        </section>

        <section id="features" className="features" aria-label="Features">
          {features.map((feature) => (
            <FeatureCard {...feature} />
          ))}
        </section>

        <section className="connect-banner">
          <div className="connect-banner-main">
            <div className="connect-banner-heading">
              <IconDatabase width={20} height={20} />
              <h2>Ready to connect?</h2>
            </div>
            <p>
              Connect your PostgreSQL database securely and start asking
              questions.
            </p>
            <button type="button" className="btn btn--connect">
              Connect Database
              <IconArrowRight width={16} height={16} />
            </button>
          </div>

          <div className="connect-banner-points">
            {trustPoints.map(({ icon: Icon, title, description }) => (
              <div className="trust-point" key={title}>
                <div className="trust-point-title">
                  <Icon width={18} height={18} />
                  <span>{title}</span>
                </div>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="footer">
          <p>Made with ❤️ for data teams and curious minds.</p>
          <p>© 2025 Talk2DB. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
