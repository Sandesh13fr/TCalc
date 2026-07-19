import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { docs, getDoc } from "../../../lib/docs";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return docs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getDoc(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/docs/${guide.slug}/` },
    openGraph: { type: "article", title: guide.title, description: guide.description, url: `/docs/${guide.slug}/`, modifiedTime: `${guide.updated}T00:00:00Z` },
  };
}

function JsonLd({ value }: { value: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replaceAll("<", "\\u003c") }} />;
}

export default async function DocGuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getDoc(slug);
  if (!guide) notFound();
  const related = guide.related.map(getDoc).filter((item) => item !== undefined);
  const howToSteps = guide.sections.flatMap((section) => section.steps ?? []).map((text, index) => ({ "@type": "HowToStep", position: index + 1, text }));
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updated,
    author: { "@type": "Organization", name: "TCalc maintainers", url: "https://github.com/Sandesh13fr/TCalc" },
    publisher: { "@type": "Organization", name: "TCalc" },
    mainEntityOfPage: `https://tcalc-one.vercel.app/docs/${guide.slug}/`,
  };
  const howToSchema = howToSteps.length ? { "@context": "https://schema.org", "@type": "HowTo", name: guide.title, description: guide.description, step: howToSteps } : null;

  return (
    <main id="main" className="guide-page">
      <JsonLd value={articleSchema} />
      {howToSchema && <JsonLd value={howToSchema} />}
      <div className="guide-shell page-shell">
        <aside className="docs-sidebar">
          <Link className="docs-back" href="/docs/">← Documentation</Link>
          <nav aria-label="Documentation guides">
            {docs.map((item) => <Link className={item.slug === guide.slug ? "active" : ""} href={`/docs/${item.slug}/`} key={item.slug}>{item.title}</Link>)}
          </nav>
        </aside>
        <article className="guide-article">
          <header>
            <p className="eyebrow"><span />{guide.category}</p>
            <h1>{guide.title}</h1>
            <p className="guide-description">{guide.description}</p>
            <div className="guide-meta"><span>Last updated <time dateTime={guide.updated}>{guide.updated}</time></span><span>{guide.sections.length} sections</span></div>
          </header>
          <section className="outcome"><small>EXPECTED OUTCOME</small><p>{guide.outcome}</p></section>
          <section className="prerequisites"><h2>Before you begin</h2><ul>{guide.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></section>
          {guide.sections.map((section, sectionIndex) => (
            <section className="guide-section" key={section.title}>
              <span className="section-index">{String(sectionIndex + 1).padStart(2, "0")}</span>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.steps && <ol>{section.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
              {section.code && <pre><code>{section.code}</code></pre>}
              {section.note && <aside className="guide-note"><strong>Note</strong><p>{section.note}</p></aside>}
            </section>
          ))}
          <section className="related-guides"><h2>Continue with</h2><div>{related.map((item) => <Link href={`/docs/${item.slug}/`} key={item.slug}><small>{item.category}</small><strong>{item.title}</strong><span aria-hidden="true">→</span></Link>)}</div></section>
        </article>
      </div>
    </main>
  );
}
