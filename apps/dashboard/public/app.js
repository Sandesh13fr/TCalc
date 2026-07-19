const reports = document.querySelector("#reports");
const detail = document.querySelector("#detail");

function show(report) {
  detail.textContent = JSON.stringify(report, null, 2);
}

fetch("/api/reports").then((response) => response.json()).then((items) => {
  reports.textContent = "";
  if (!items.length) reports.textContent = "No uploaded reports yet.";
  for (const item of items) {
    const button = document.createElement("button");
    button.className = "card";
    button.textContent = `${item.title} · ${item.goal ?? "no goal"} · ${item.summary?.includedTokens ?? 0} tokens`;
    button.addEventListener("click", () => fetch(`/api/reports/${item.id}`).then((response) => response.json()).then(show));
    reports.append(button);
  }
}).catch(() => { reports.textContent = "Dashboard service unavailable."; });

document.querySelector("#file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (file) show(JSON.parse(await file.text()));
});
