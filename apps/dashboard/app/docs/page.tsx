import type { Metadata } from "next";
import Link from "next/link";
import { docs } from "../../lib/docs";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Install TCalc, use the CLI, configure model catalogs, connect coding agents over MCP, and review reports.",
  alternates: { canonical: "/docs/" },
  openGraph: {
    type: "website",
    url: "/docs/",
    title: "TCalc documentation",
    description: "Task-focused guides for TCalc in VS Code, the CLI, model catalogs, MCP, and reports.",
  },
};

export default function DocsHome() {
  return (
    <main id="main" className="docs-page">
      <section className="docs-hero page-shell">
        <p className="eyebrow"><span />TCalc documentation</p>
        <h1>Measure context.<br /><em>Make the next move.</em></h1>
        <p>TCalc documentation covers the local VS Code workflow, repeatable CLI commands, model-catalog overrides, coding-agent MCP connections, and report automation.</p>
        <div className="button-row"><Link className="button" href="/docs/getting-started/">Start with VS Code</Link><Link className="button button-secondary" href="/docs/cli-workflows/">Use the CLI</Link></div>
      </section>
      <section className="docs-index page-shell" aria-labelledby="guides-heading">
        <div className="docs-index-heading"><p>GUIDES / {String(docs.length).padStart(2, "0")}</p><h2 id="guides-heading">Choose a workflow</h2></div>
        <div className="docs-list">
          {docs.map((guide, index) => (
            <Link href={`/docs/${guide.slug}/`} key={guide.slug}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><small>{guide.category}</small><h3>{guide.title}</h3><p>{guide.description}</p></div>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      </section>
      <section className="docs-callout page-shell"><div><p className="eyebrow"><span />Need the source?</p><h2>Every guide maps to open code.</h2></div><a className="button" href="https://github.com/Sandesh13fr/TCalc">View on GitHub <span aria-hidden="true">↗</span></a></section>
    </main>
  );
}
