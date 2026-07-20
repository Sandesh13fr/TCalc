import Link from "next/link";
import Lightfall from "../components/Lightfall";
import ReportViewer from "../components/ReportViewer";
import { docs } from "../lib/docs";

const providers = [
  { name: "OpenAI", src: "/providers/openai.svg", className: "provider-invert" },
  { name: "Google", src: "/providers/google.svg" },
  { name: "Anthropic", src: "/providers/anthropic.svg", className: "provider-invert" },
  { name: "Mistral AI", src: "/providers/mistral.svg" },
  { name: "Cohere", src: "/providers/cohere.png" },
  { name: "DeepSeek", src: "/providers/deepseek.svg" },
];

const modelRows = [
  ["1", "Gemini 2.5 Pro", "1,048,576 context", "$0.86"],
  ["2", "GPT-4o", "128,000 context", "$1.32"],
  ["3", "Claude Sonnet 4", "200,000 context", "$1.18"],
  ["4", "Mistral Large 2", "128,000 context", "$0.74"],
  ["5", "DeepSeek V3", "128,000 context", "$0.52"],
];

const featureRows = [
  ["Accurate token counting", "Model-aware tokenization for precise estimates."],
  ["Smart model recommendations", "Ranked by fit, context window, and cost."],
  ["100% local and private", "Everything runs on your machine. Zero telemetry."],
  ["Workspace aware", "Respects .gitignore, files, and language heuristics."],
];

const workflowRows = [
  ["1", "Open a workspace", "TCalc scans your project locally."],
  ["2", "We count your context", "Input, output, and file breakdowns."],
  ["3", "Get model recommendations", "See the best models for your context and budget."],
  ["4", "Pick and ship", "Choose with confidence and keep building."],
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
    <main id="main" className="home-page">
      <JsonLd value={softwareSchema} />
      <JsonLd value={faqSchema} />
      <section className="hero" id="top">
        <Lightfall colors={["#31b8ff", "#087fc8", "#86dbff"]} backgroundColor="#06111a" speed={0.52} streakCount={7} streakWidth={0.75} streakLength={1.25} glow={0.8} density={0.8} twinkle={0.35} zoom={3.4} backgroundGlow={0.48} opacity={0.65} mouseStrength={0.35} mouseRadius={0.75} />
        <div className="hero-grid page-shell">
          <div className="hero-copy">
            <h1>Know your context.<br /><em>Choose the right model.</em></h1>
            <p className="hero-text">TCalc analyzes your code and prompts locally to calculate accurate token counts and recommend the best coding models for the job.</p>
            <div className="button-row">
              <a className="button" href="https://marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc">Install for VS Code <span aria-hidden="true">VS</span></a>
              <Link className="button button-secondary" href="/docs/">Read the docs <span aria-hidden="true">&rarr;</span></Link>
            </div>
            <ul className="proof" aria-label="Product guarantees"><li>100% local</li><li>No telemetry</li><li>Open source</li></ul>
          </div>
          <div className="product-window" aria-label="Example TCalc workspace dashboard">
            <div className="window-meta"><span><small>Workspace</small><strong>tcalc / src</strong></span><span><small>Model profile</small><strong>Coding (General)</strong></span><span><small>Scan</small><strong>Just now <i aria-label="Complete" /></strong></span></div>
            <div className="window-grid">
              <section className="token-panel">
                <small>TOKEN SUMMARY</small><strong className="token-total">1,246,512</strong>
                <div className="token-facts"><span>862,132<small>Input tokens</small></span><span>384,380<small>Output tokens</small></span></div>
                <div className="context-bars" aria-label="Example context distribution"><small>CONTEXT BREAKDOWN</small><span><i style={{ width: "72.4%" }} /><b>Code</b><em>72.4%</em></span><span><i style={{ width: "12.8%" }} /><b>Comments</b><em>12.8%</em></span><span><i style={{ width: "8.7%" }} /><b>Docs</b><em>8.7%</em></span><span><i style={{ width: "6.1%" }} /><b>Other</b><em>6.1%</em></span></div>
                <div className="token-meta"><span>Files <b>236</b></span><span>Lines <b>18,392</b></span><span>Languages <b>TypeScript, Python</b></span></div>
              </section>
              <section className="model-panel">
                <div className="panel-heading"><small>RECOMMENDED MODELS</small></div>
                <ol>{modelRows.map(([rank, name, detail, cost]) => <li key={rank}><span className="rank">{rank}</span><div><strong>{name}{rank === "1" && <em>Best fit</em>}</strong><small>{detail}</small></div><b>{cost}<small>est. cost</small></b></li>)}</ol>
                <div className="model-footer"><span>Pricing cached: 2m ago</span><Link href="/docs/model-catalog/">Configure models &rarr;</Link></div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section className="provider-strip page-shell" aria-label="Supported model providers">
        <span>Supports leading providers</span>
        <div className="provider-logos">{providers.map((provider) => <div className="provider-logo" key={provider.name}><img src={provider.src} alt={provider.name} className={provider.className} /></div>)}<b>+ more</b></div>
      </section>

      <section className="ops-shell page-shell" id="product">
        <article className="ops-column"><h2>Features</h2><ul>{featureRows.map(([title, text]) => <li key={title}><i aria-hidden="true" /><div><strong>{title}</strong><span>{text}</span></div></li>)}</ul></article>
        <article className="ops-column" id="workflow"><h2>Workflow</h2><ol>{workflowRows.map(([step, title, text]) => <li key={step}><b>{step}</b><div><strong>{title}</strong><span>{text}</span></div></li>)}</ol></article>
        <article className="ops-column" id="documentation"><h2>Documentation</h2><ul className="docs-quick">{docs.slice(0, 4).map((guide) => <li key={guide.slug}><Link href={`/docs/${guide.slug}/`}><div><strong>{guide.title}</strong><span>{guide.description}</span></div><b aria-hidden="true">&rarr;</b></Link></li>)}</ul><Link className="ops-doc-link" href="/docs/">View all docs &rarr;</Link></article>
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
