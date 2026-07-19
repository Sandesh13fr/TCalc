import Link from "next/link";
import Lightfall from "../components/Lightfall";
import ReportViewer from "../components/ReportViewer";
import { docs } from "../lib/docs";

const providers = ["OpenAI", "Anthropic", "Google AI", "xAI", "Groq", "DeepSeek", "Local runtimes"];
const modelRows = [
  ["01", "Gemini 2.5 Pro", "Balanced · Google AI", "91"],
  ["02", "Claude Sonnet 4", "High confidence · Anthropic", "89"],
  ["03", "DeepSeek V3", "Cost efficient · DeepSeek", "86"],
];

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TCalc",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Windows, macOS, Linux",
  description: "A local-first workspace token calculator, coding-model recommender, and agent-context optimizer.",
  url: "https://tcalc-one.vercel.app/",
  downloadUrl: "https://marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc",
  softwareVersion: "0.1.4",
  license: "https://opensource.org/license/mit",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  codeRepository: "https://github.com/Sandesh13fr/TCalc",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Does TCalc upload my source code?", acceptedAnswer: { "@type": "Answer", text: "No. TCalc scans, estimates tokens, ranks models, and generates reports locally without uploading workspace source." } },
    { "@type": "Question", name: "Why does TCalc show only one fitting model?", acceptedAnswer: { "@type": "Answer", text: "A large required context, local-only privacy mode, a restrictive team profile, or a small custom catalog can narrow the eligible set to one model." } },
    { "@type": "Question", name: "Can I use TCalc without VS Code?", acceptedAnswer: { "@type": "Answer", text: "Yes. The repository includes a command-line interface and an experimental local stdio MCP server." } },
  ],
};

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replaceAll("<", "\\u003c") }} />;
}

export default function Home() {
  return (
    <main id="main">
      <JsonLd value={softwareSchema} />
      <JsonLd value={faqSchema} />
      <section className="hero" id="top">
        <Lightfall
          colors={["#31b8ff", "#087fc8", "#86dbff"]}
          backgroundColor="#06111a"
          speed={0.52}
          streakCount={7}
          streakWidth={0.75}
          streakLength={1.25}
          glow={0.8}
          density={0.8}
          twinkle={0.35}
          zoom={3.4}
          backgroundGlow={0.48}
          opacity={0.65}
          mouseStrength={0.35}
          mouseRadius={0.75}
        />
        <div className="hero-grid page-shell">
          <div className="hero-copy">
            <p className="eyebrow"><span />Local-first workspace intelligence</p>
            <h1>Know your context.<br /><em>Choose the right model.</em></h1>
            <p className="hero-text">TCalc measures a real codebase, shows where tokens go, and ranks models for the job. No source upload, telemetry, account, or hard-coded winner.</p>
            <div className="button-row">
              <a className="button" href="https://marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc">Install for VS Code <span aria-hidden="true">↗</span></a>
              <Link className="button button-secondary" href="/docs/">Read the docs <span aria-hidden="true">→</span></Link>
            </div>
            <ul className="proof" aria-label="Product guarantees">
              <li>100% local analysis</li>
              <li>No telemetry</li>
              <li>MIT licensed</li>
            </ul>
          </div>
          <div className="product-window" aria-label="Example TCalc workspace dashboard">
            <header className="window-bar"><span>TCALC / WORKSPACE</span><b>SCAN COMPLETE</b></header>
            <div className="window-meta"><span><small>Workspace</small><strong>commerce-platform / src</strong></span><span><small>Goal</small><strong>Add feature</strong></span><span><small>Scan</small><strong>Just now</strong></span></div>
            <div className="window-grid">
              <section className="token-panel">
                <small>TOKEN SUMMARY</small>
                <strong className="token-total">184,760</strong>
                <p>included tokens across 612 files</p>
                <div className="context-bars" aria-label="Example token distribution">
                  <span><i style={{ width: "72%" }} /><b>Code</b><em>72%</em></span>
                  <span><i style={{ width: "14%" }} /><b>Docs</b><em>14%</em></span>
                  <span><i style={{ width: "9%" }} /><b>Tests</b><em>9%</em></span>
                  <span><i style={{ width: "5%" }} /><b>Other</b><em>5%</em></span>
                </div>
              </section>
              <section className="model-panel">
                <div className="panel-heading"><small>RECOMMENDED MODELS</small><b>RANKED</b></div>
                <ol>{modelRows.map(([rank, name, detail, score]) => <li key={rank}><span className="rank">{rank}</span><div><strong>{name}</strong><small>{detail}</small></div><b>{score}</b></li>)}</ol>
              </section>
            </div>
            <footer className="window-footer"><span>20 models</span><span>9 provider endpoints</span><span>Local catalog</span></footer>
          </div>
        </div>
      </section>

      <section className="provider-strip" aria-label="Supported model providers">
        <span>Supported providers</span>{providers.map((provider) => <b key={provider}>{provider}</b>)}
      </section>

      <section className="section page-shell" id="product">
        <div className="section-heading">
          <div><p className="eyebrow"><span />One scan, useful decisions</p><h2>Stop choosing models<br />by reputation alone.</h2></div>
          <p>TCalc measures the workspace you have and applies your goal, context limit, privacy policy, quality threshold, and estimated cost.</p>
        </div>
        <div className="feature-grid">
          <article className="feature feature-wide"><span className="feature-number">01</span><div><h3>See where every token goes</h3><p>Break down context by file, folder, and language. Flag generated, oversized, or risky paths before they reach an agent.</p></div><div className="mini-bars" aria-hidden="true"><span><b>src/</b><i style={{ width: "78%" }} /><em>82.4k</em></span><span><b>docs/</b><i style={{ width: "46%" }} /><em>41.8k</em></span><span><b>tests/</b><i style={{ width: "29%" }} /><em>27.2k</em></span></div></article>
          <article className="feature"><span className="feature-number">02</span><h3>Rank the full catalogue</h3><p>Compare 20 bundled models and return cheapest-sufficient, balanced, and high-confidence choices with distinct reasons.</p></article>
          <article className="feature feature-accent"><span className="feature-number">03</span><h3>Keep source local</h3><p>Scanning, recommendation, repo mapping, and report generation stay on your machine.</p><strong>0 source bytes uploaded</strong></article>
          <article className="feature"><span className="feature-number">04</span><h3>Build agent-ready context</h3><p>Generate a budgeted repo map, goal-aware rules, CI artifacts, or local MCP configuration for the tools you already use.</p></article>
        </div>
      </section>

      <section className="workflow" id="workflow">
        <div className="page-shell">
          <div className="section-heading inverted"><div><p className="eyebrow"><span />From codebase to decision</p><h2>Three steps.<br />No cloud required.</h2></div><p>The extension, CLI, and MCP server use the same provider-neutral core.</p></div>
          <ol className="workflow-list">
            <li><span>01</span><div><h3>Scan</h3><p>Open a workspace and let TCalc apply ignore rules, file safety checks, and token estimation locally.</p></div><code>TCalc: Scan Workspace</code></li>
            <li><span>02</span><div><h3>Compare</h3><p>Set the current goal and review model fit, context headroom, estimated cost, and privacy constraints.</p></div><code>TCalc: Compare Models</code></li>
            <li><span>03</span><div><h3>Prepare context</h3><p>Export a report, compact repo map, agent rules, or a ready-to-use local MCP client configuration.</p></div><code>pnpm cli repo-map . --budget 8000</code></li>
          </ol>
        </div>
      </section>

      <section className="section page-shell" id="documentation">
        <div className="section-heading"><div><p className="eyebrow"><span />Documentation</p><h2>From first scan<br />to agent workflow.</h2></div><p>Task-focused guides use the same commands and configuration shipped in the repository.</p></div>
        <div className="docs-grid">
          {docs.slice(0, 4).map((guide) => <Link className="doc-card" href={`/docs/${guide.slug}/`} key={guide.slug}><small>{guide.category}</small><h3>{guide.title}</h3><p>{guide.description}</p><span>Read guide <b aria-hidden="true">→</b></span></Link>)}
        </div>
        <Link className="text-link" href="/docs/">Browse all documentation <span aria-hidden="true">→</span></Link>
      </section>

      <section className="report-section" id="report"><div className="page-shell"><ReportViewer /></div></section>

      <section className="section page-shell faq-section">
        <div className="section-heading"><div><p className="eyebrow"><span />Common questions</p><h2>Clear answers,<br />before the scan.</h2></div></div>
        <div className="faq-list">
          <details><summary>Does TCalc upload my source code?</summary><p>No. Workspace scanning, token estimation, model ranking, repo maps, and report generation run locally. The hosted report viewer reads a selected JSON file in your browser.</p></details>
          <details><summary>Why might only one model fit?</summary><p>The required context, local-only privacy mode, team model policy, or a small custom catalogue can narrow the eligible candidates. The model-catalog guide shows how to diagnose each filter.</p></details>
          <details><summary>Can I use TCalc outside VS Code?</summary><p>Yes. The monorepo includes a CLI, GitHub Action workflows, an optional report service, and an experimental stdio MCP server for coding agents.</p></details>
        </div>
      </section>
    </main>
  );
}
