const detail = document.querySelector("#detail");
const status = document.querySelector("#report-status");
const saved = document.querySelector("#saved");
const reports = document.querySelector("#reports");

const exampleReport = {
  schemaVersion: "1.0.0",
  title: "commerce-platform",
  generatedAt: "2026-07-19T12:00:00.000Z",
  goal: "add-feature",
  summary: {
    totalFiles: 742,
    includedFiles: 612,
    excludedFiles: 130,
    totalEstimatedTokens: 221430,
    includedTokens: 184760,
  },
  recommendations: {
    cheapestSufficient: { displayName: "DeepSeek V3", provider: "DeepSeek", score: 0.86 },
    balanced: { displayName: "Gemini 2.5 Pro", provider: "Google AI", score: 0.91 },
    highConfidence: { displayName: "Claude Sonnet 4", provider: "Anthropic", score: 0.89 },
  },
};

function isReport(value) {
  const summary = value?.summary;
  return value?.schemaVersion === "1.0.0" && typeof value.title === "string" && summary &&
    ["totalFiles", "includedFiles", "excludedFiles", "totalEstimatedTokens", "includedTokens"]
      .every((key) => Number.isFinite(summary[key]) && summary[key] >= 0);
}

function recommendationRows(recommendations) {
  if (!recommendations || typeof recommendations !== "object") return [];
  return [
    ["Cheapest sufficient", recommendations.cheapestSufficient],
    ["Balanced", recommendations.balanced],
    ["High confidence", recommendations.highConfidence],
  ].filter(([, model]) => model && typeof model === "object");
}

function show(report) {
  if (!isReport(report)) throw new Error("This is not a valid TCalc report (schema 1.0.0).");
  const rows = recommendationRows(report.recommendations);
  detail.replaceChildren();

  const head = document.createElement("header");
  head.className = "report-head";
  head.append(text("small", `${report.goal ?? "No goal"} · ${formatDate(report.generatedAt)}`));
  head.append(text("h3", report.title));

  const metrics = document.createElement("div");
  metrics.className = "report-metrics";
  metrics.append(metric("Included tokens", report.summary.includedTokens));
  metrics.append(metric("Files scanned", report.summary.totalFiles));
  metrics.append(metric("Files excluded", report.summary.excludedFiles));

  const models = document.createElement("section");
  models.className = "report-models";
  models.append(text("small", "MODEL RECOMMENDATIONS"));
  if (!rows.length) {
    models.append(text("p", "No model recommendations in this report."));
  } else {
    const list = document.createElement("ol");
    for (const [label, model] of rows) {
      const item = document.createElement("li");
      const name = document.createElement("span");
      name.append(text("strong", model.displayName ?? model.modelId ?? "Unknown model"));
      name.append(text("small", `${label} · ${model.provider ?? model.tier ?? "Provider in catalogue"}`));
      const score = Number(model.score?.totalScore ?? model.score);
      item.append(name, text("b", Number.isFinite(score) ? `${Math.round(score * 100)}/100` : "—"));
      list.append(item);
    }
    models.append(list);
  }

  detail.append(head, metrics, models);
}

function text(tag, value) {
  const node = document.createElement(tag);
  node.textContent = String(value);
  return node;
}

function metric(label, value) {
  const node = document.createElement("div");
  node.className = "report-metric";
  node.append(text("small", label), text("strong", Number(value).toLocaleString()));
  return node;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function showError(error) {
  detail.replaceChildren(text("p", error instanceof Error ? error.message : String(error)));
  detail.firstElementChild.className = "report-error";
  status.textContent = "Could not open that report.";
}

document.querySelector("#example").addEventListener("click", () => {
  show(exampleReport);
  status.textContent = "Showing a safe example report.";
});

document.querySelector("#file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1_000_000) throw new Error("Report is larger than the 1 MB limit.");
    show(JSON.parse(await file.text()));
    status.textContent = `Opened ${file.name} locally. Nothing was uploaded.`;
  } catch (error) {
    showError(error);
  } finally {
    event.target.value = "";
  }
});

fetch("./api/reports")
  .then((response) => {
    if (!response.ok) throw new Error("No report service");
    return response.json();
  })
  .then((items) => {
    if (!Array.isArray(items) || !items.length) return;
    saved.hidden = false;
    for (const item of items) {
      const button = document.createElement("button");
      button.className = "saved-card";
      button.textContent = `${item.title} · ${item.goal ?? "no goal"} · ${item.summary?.includedTokens ?? 0} tokens`;
      button.addEventListener("click", async () => {
        try {
          const response = await fetch(`./api/reports/${encodeURIComponent(item.id)}`);
          if (!response.ok) throw new Error("Could not load that saved report.");
          show(await response.json());
          status.textContent = `Opened saved report ${item.title}.`;
        } catch (error) {
          showError(error);
        }
      });
      reports.append(button);
    }
  })
  .catch(() => {});

show(exampleReport);
