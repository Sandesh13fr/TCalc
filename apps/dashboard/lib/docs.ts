export type DocSection = {
  title: string;
  paragraphs?: string[];
  steps?: string[];
  code?: string;
  note?: string;
};

export type DocGuide = {
  slug: string;
  category: string;
  title: string;
  description: string;
  outcome: string;
  prerequisites: string[];
  sections: DocSection[];
  related: string[];
  updated: string;
};

export const docs: DocGuide[] = [
  {
    slug: "getting-started",
    category: "Start",
    title: "Install TCalc and run your first workspace scan",
    description: "Install the VS Code extension, scan a local workspace, and understand the first set of token and model results.",
    outcome: "A local dashboard with workspace totals, heavy paths, and three goal-aware model recommendations.",
    prerequisites: ["Visual Studio Code 1.85 or newer", "A folder or workspace you can open locally"],
    updated: "2026-07-20",
    related: ["model-catalog", "cli-workflows"],
    sections: [
      {
        title: "Install the extension",
        paragraphs: [
          "Install TCalc from the VS Code Marketplace or Open VSX. The extension includes its model catalog, so a workspace does not need catalogs/models.json or .tcalc/models.json for the first scan.",
          "If you downloaded a release artifact instead, install the VSIX from the Extensions view or with the command below. Replace the wildcard with the file you downloaded when your shell does not expand it.",
        ],
        code: "code --install-extension dist-vsix/tcalc-0.1.4.vsix",
      },
      {
        title: "Run Quick Start",
        steps: [
          "Open the code workspace you want to measure.",
          "Open the Command Palette and run TCalc: Quick Start.",
          "Choose the goal that best matches the work, such as debugging, refactoring, documentation, or security review.",
          "Review the dashboard after the local scan completes.",
        ],
        note: "Scanning, token estimation, recommendation, and report generation run locally. TCalc does not upload source or require a model API key.",
      },
      {
        title: "Read the results",
        paragraphs: [
          "Included tokens are the estimated context after ignore rules and safety exclusions. Top files and folders show where a smaller repo map or another exclusion can save the most context. Warnings identify generated, oversized, or risky paths without copying their contents into a remote service.",
          "The model section is a ranked catalogue, not a single hard-coded winner. Cheapest sufficient favors cost after meeting the task threshold, balanced trades quality against cost and latency, and high confidence favors capability. Change the goal, privacy mode, or context selection when only one model fits.",
        ],
      },
    ],
  },
  {
    slug: "cli-workflows",
    category: "CLI",
    title: "Use TCalc from the command line",
    description: "Build the monorepo once, then scan, recommend, map, and report from repeatable local commands.",
    outcome: "Reproducible token reports and agent-ready artifacts that can run locally or in CI.",
    prerequisites: ["Node.js 20 or newer", "pnpm", "A local clone of the TCalc repository"],
    updated: "2026-07-20",
    related: ["getting-started", "team-reports", "coding-agent-mcp"],
    sections: [
      {
        title: "Build the CLI",
        paragraphs: [
          "Install workspace dependencies and build the packages before invoking the repository-local binary. The root pnpm cli script points to the compiled command entry point.",
        ],
        code: "pnpm install\npnpm build\npnpm cli --help",
      },
      {
        title: "Choose the smallest useful command",
        paragraphs: [
          "Use scan when you need workspace size and hot paths, recommend when the decision is model selection, and repo-map when an agent needs a compact structural view. Rules creates goal-aware agent instructions, while report combines the scan and recommendations into Markdown or JSON.",
        ],
        code: "pnpm cli scan ./my-project\npnpm cli recommend ./my-project --goal add-feature\npnpm cli repo-map ./my-project --budget 8000\npnpm cli rules ./my-project --target codex --mode repo-map-first\npnpm cli report ./my-project --include-repo-map --output workspace-model-report.md",
      },
      {
        title: "Use explicit paths in automation",
        steps: [
          "Pass the workspace path instead of relying on the runner's current directory.",
          "Write reports to a dedicated artifact folder such as dist-ci.",
          "Validate a custom catalog before using it with recommendation or report commands.",
          "Upload only generated reports; TCalc does not need source files outside the runner.",
        ],
        note: "The CLI supports an explicit --catalog path. Keep volatile model facts in catalog JSON rather than embedding them in scripts.",
      },
    ],
  },
  {
    slug: "model-catalog",
    category: "Configure",
    title: "Configure and validate the local model catalog",
    description: "Understand the bundled 20-model catalog, workspace overrides, provider endpoints, and the filters that narrow recommendations.",
    outcome: "A validated provider-neutral catalog that returns distinct recommendation tiers for the selected goal and privacy policy.",
    prerequisites: ["TCalc installed or built", "JSON editing access only if you need an override"],
    updated: "2026-07-20",
    related: ["getting-started", "cli-workflows"],
    sections: [
      {
        title: "Start with the bundled catalog",
        paragraphs: [
          "TCalc ships with 20 model entries across seven catalog providers and configuration for nine provider endpoints, including local runtimes. The catalog records context windows, output limits, price fields, tool and image support, privacy mode, coding and latency signals, and review dates.",
          "Missing workspace overrides are normal. The VS Code extension silently checks catalogs/models.json and .tcalc/models.json, then keeps using the bundled catalog when neither file exists. Those paths are optional customization points, not installation requirements.",
        ],
      },
      {
        title: "Add a workspace override",
        steps: [
          "Copy the bundled catalog shape into catalogs/models.json or .tcalc/models.json in the workspace.",
          "Keep every required field typed correctly and use ISO dates for updatedAt.",
          "Validate the file before scanning with it.",
          "Run TCalc: Update Model Catalog in VS Code to see the bundled and override status.",
        ],
        code: "pnpm cli catalog validate .tcalc/models.json\npnpm cli recommend . --catalog .tcalc/models.json --goal refactor",
      },
      {
        title: "Why a scan may show only one fitting model",
        paragraphs: [
          "Recommendation results are filtered before ranking. A large required context, local-only privacy mode, a restrictive team model profile, or a custom catalog with few eligible records can leave one fitting candidate. This is different from having only one model installed in the catalogue.",
          "First confirm the dashboard's catalogue count. Then reduce selected context with ignores or a repo map, review the goal and privacy mode, and check team provider or model allowlists. TCalc keeps the three tiers distinct when enough eligible candidates exist; it does not fill them from raw catalog order.",
        ],
      },
    ],
  },
  {
    slug: "coding-agent-mcp",
    category: "Integrate",
    title: "Connect a coding agent through local MCP",
    description: "Expose scans, recommendations, repo maps, rules, and reports to an MCP-compatible coding tool over stdio.",
    outcome: "A coding agent can request compact TCalc context while source processing stays on the local machine.",
    prerequisites: ["A built TCalc CLI", "An MCP client with stdio server support"],
    updated: "2026-07-20",
    related: ["cli-workflows", "model-catalog"],
    sections: [
      {
        title: "Generate a client configuration",
        paragraphs: [
          "TCalc can generate configuration for Cursor and Continue, and the same stdio command works with Claude Desktop, Claude Code, Cline, Roo, and generic MCP clients. Generate the file for the workspace so TCalc can set the allowed root explicitly.",
        ],
        code: "pnpm cli mcp-config --target cursor\npnpm cli mcp-config --target continue --output continue-mcp.yaml",
      },
      {
        title: "Available capabilities",
        paragraphs: [
          "The experimental server exposes scan_workspace, recommend_models, create_repo_map, generate_agent_rules, generate_report, and validate_model_catalog. It also provides compact workspace and model-catalog resources plus a prompt for optimizing an agent against a goal and token budget.",
          "Repo maps are structural and do not return full source file bodies. Risky files are surfaced by path only. The server does not execute shell input or fetch remote URLs as part of normal tool handling.",
        ],
      },
      {
        title: "Run and secure the server",
        steps: [
          "Start the server with pnpm cli mcp or the compiled wma-mcp binary.",
          "Keep stdio attached to the client process; the MVP has no HTTP or hosted transport.",
          "Set the workspace as the allowed root and keep generated client configuration out of shared secrets.",
          "Restart the server when you want to clear its in-memory scan state.",
        ],
        note: "The MCP server is an experimental local MVP: stdio only, no authentication layer, no hosted mode, and no live pricing feed.",
      },
    ],
  },
  {
    slug: "team-reports",
    category: "Reports",
    title: "Review local and CI-generated TCalc reports",
    description: "Open a report in the browser, produce CI artifacts, or self-host the optional versioned report service.",
    outcome: "Share token and recommendation evidence without storing workspace source in the report service.",
    prerequisites: ["A TCalc JSON report using schema version 1.0.0", "A browser, GitHub Actions runner, or Node host"],
    updated: "2026-07-20",
    related: ["cli-workflows", "getting-started"],
    sections: [
      {
        title: "Open a report without uploading it",
        paragraphs: [
          "Use the report viewer on the TCalc home page to open a JSON report. The browser validates schema version 1.0.0 and renders summary totals and recommendation tiers locally. Selecting a file does not send it to the hosted website.",
          "Reports contain aggregates, warnings, paths, and recommendations rather than source file contents. Review file paths before sharing an exported artifact if repository structure itself is sensitive.",
        ],
      },
      {
        title: "Generate reports in GitHub Actions",
        paragraphs: [
          "The repository includes a TCalc report workflow for pull requests and manual runs. It builds the local CLI, creates a Markdown report, a budgeted repo map, and structured model recommendations, then uploads those files as workflow artifacts. Trusted same-repository pull requests can receive a compact summary comment; fork pull requests remain read-only.",
        ],
        code: "pnpm build\npnpm ci:workspace-report",
      },
      {
        title: "Run the optional report service",
        steps: [
          "Set TCALC_DASHBOARD_TOKEN to enable authenticated uploads.",
          "Start the dashboard package after building the Next.js export.",
          "POST schema-valid JSON to /api/reports with a Bearer token.",
          "Set TCALC_DATA_DIR, TCALC_DASHBOARD_HOST, and PORT when the defaults do not fit the host.",
        ],
        code: "$env:TCALC_DASHBOARD_TOKEN = \"replace-with-a-secret\"\npnpm --filter @wma/dashboard build\npnpm --filter @wma/dashboard start",
        note: "The optional service stores versioned report JSON only. It binds to 127.0.0.1 by default and does not receive source files.",
      },
    ],
  },
];

export function getDoc(slug: string) {
  return docs.find((guide) => guide.slug === slug);
}
