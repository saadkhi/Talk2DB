import { IconDatabase, IconUser, IconSparkles, IconTerminal } from "./icons";

export default function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-visual-glow" />

      <div className="hero-db">
        <IconDatabase width={46} height={46} />
      </div>

      <div className="hero-card hero-card--question">
        <span className="hero-card-avatar">
          <IconUser width={14} height={14} />
        </span>
        <p>
          How many sales were made last month and what&apos;s the total
          revenue?
        </p>
        <IconSparkles width={14} height={14} className="hero-card-spark" />
      </div>

      <div className="hero-card hero-card--sql">
        <div className="hero-card-label">
          <IconTerminal width={13} height={13} />
          <span>SQL</span>
        </div>
        <pre className="hero-sql">
          <span className="tok-kw">SELECT</span>{"\n  "}
          <span className="tok-fn">COUNT</span>(<span className="tok-op">*</span>){" "}
          <span className="tok-kw">as</span> total_sales,{"\n  "}
          <span className="tok-fn">SUM</span>(revenue){" "}
          <span className="tok-kw">as</span> total_revenue{"\n"}
          <span className="tok-kw">FROM</span> sales{"\n"}
          <span className="tok-kw">WHERE</span> created_at{" "}
          <span className="tok-op">&gt;=</span>{" "}
          <span className="tok-fn">DATE_TRUNC</span>(
          <span className="tok-str">&apos;month&apos;</span>,{"\n    "}
          <span className="tok-kw">CURRENT_DATE</span> -{" "}
          <span className="tok-kw">INTERVAL</span>{" "}
          <span className="tok-str">&apos;1 month&apos;</span>);
        </pre>
      </div>

      <div className="hero-card hero-card--results">
        <div className="hero-card-label">
          <span className="hero-results-icon">≍</span>
          <span>Results</span>
        </div>
        <table className="hero-results-table">
          <thead>
            <tr>
              <th>total_sales</th>
              <th>total_revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1,250</td>
              <td>$98,420.50</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
