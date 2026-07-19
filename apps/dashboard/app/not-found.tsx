import Link from "next/link";

export default function NotFound() {
  return <main id="main" className="not-found page-shell"><p className="eyebrow"><span />404</p><h1>That page is outside the map.</h1><p>The route may have moved, or it may never have been part of TCalc.</p><Link className="button" href="/">Return home</Link></main>;
}
