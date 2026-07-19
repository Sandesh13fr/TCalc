import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = "https://tcalc-one.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "TCalc — Local workspace token calculator", template: "%s | TCalc" },
  description: "Measure workspace tokens locally, compare coding models, and generate agent-ready context without uploading source code.",
  applicationName: "TCalc",
  authors: [{ name: "TCalc maintainers", url: "https://github.com/Sandesh13fr/TCalc" }],
  creator: "TCalc maintainers",
  keywords: ["workspace token calculator", "AI coding model comparison", "VS Code extension", "MCP server", "repo map"],
  alternates: { canonical: "/" },
  icons: { icon: "/tcalc-logo.png", apple: "/tcalc-logo.png" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "TCalc",
    title: "TCalc — Know your context before your agent does",
    description: "Local workspace token estimates, goal-aware model recommendations, and agent-ready context.",
    images: [{ url: "/tcalc-logo.png", width: 1024, height: 1024, alt: "Official TCalc logo" }],
  },
  twitter: {
    card: "summary",
    title: "TCalc — Local workspace token calculator",
    description: "Measure context, compare coding models, and prepare agent-ready workspace maps locally.",
    images: ["/tcalc-logo.png"],
  },
};

function Logo() {
  return (
    <Link className="brand" href="/" aria-label="TCalc home">
      <Image src="/tcalc-logo.png" width={46} height={46} alt="" priority />
      <span>TCalc</span>
    </Link>
  );
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header className="site-header">
          <div className="header-shell">
            <Logo />
            <nav aria-label="Main navigation">
              <Link href="/#product">Product</Link>
              <Link href="/#workflow">Workflow</Link>
              <Link href="/docs/">Docs</Link>
              <a href="https://github.com/Sandesh13fr/TCalc">GitHub</a>
            </nav>
            <a className="button button-small" href="https://marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc">Install extension</a>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="footer-lead">
            <Logo />
            <p>Context intelligence for coding agents. Local-first, provider-neutral, and open source.</p>
          </div>
          <div className="footer-links" aria-label="Project links">
            <Link href="/docs/">Documentation</Link>
            <a href="https://github.com/Sandesh13fr/TCalc">GitHub</a>
            <a href="https://marketplace.visualstudio.com/items?itemName=Sandesh13fr.tcalc">VS Code Marketplace</a>
            <a href="https://open-vsx.org/extension/Sandesh13fr/tcalc">Open VSX</a>
          </div>
          <small>MIT License · TCalc</small>
        </footer>
      </body>
    </html>
  );
}
