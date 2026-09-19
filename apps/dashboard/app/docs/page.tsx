import Link from "next/link";
import Lightfall from "../components/Lightfall";
import ReportViewer from "../components/ReportViewer";
import { docs } from "../lib/docs";

// 1. Define strict TypeScript interfaces
interface Provider {
  name: string;
  src: string;
  className?: string; 
}

type ModelRow = [string, string, string, string];
type FeatureRow = [string, string];

// 2. Apply types to the existing constants
const providers: Provider[] = [
  { name: "OpenAI", src: "/providers/openai.svg", className: "provider-invert" },
  { name: "Google", src: "/providers/google.svg" },
  { name: "Anthropic", src: "/providers/anthropic.svg", className: "provider-invert" },
  { name: "Mistral AI", src: "/providers/mistral.svg" },
  { name: "Cohere", src: "/providers/cohere.png" },
  { name: "DeepSeek", src: "/providers/deepseek.svg" },
];

const modelRows: ModelRow[] = [
  ["1", "Gemini 2.5 Pro", "1,048,576 context", "$0.86"],
  ["2", "GPT-4o", "128,000 context", "$1.32"],
  ["3", "Claude Sonnet 4", "200,000 context", "$1.18"],
  ["4", "Mistral Large 2", "128,000 context", "$0.74"],
  ["5", "DeepSeek V3", "128,000 context", "$0.52"],
];

const featureRows: FeatureRow[] = [
  ["Accurate token counting", "Model aware tokenization for precise estimates."],
  ["Smart model recommendations", "Ranked by fit, context window, and cost."],
  ["100% local and private", "Everything runs on your machine. Zero telemetry."],
  ["Workspace aware", "Respects .gitignore, files, and language heuristics."],
];
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
