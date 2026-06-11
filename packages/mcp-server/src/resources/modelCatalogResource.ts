import { getLatestCatalog } from "../state.js";
import { createCompactCatalogSummary } from "../utils/compactResults.js";

export async function readModelCatalog(): Promise<{
  contents: Array<{ uri: string; text: string }>;
}> {
  const catalog = getLatestCatalog();

  if (!catalog) {
    return {
      contents: [
        {
          uri: "model-catalog://models",
          text: "No model catalog has been loaded yet. Use the recommend_models or validate_model_catalog tool first.",
        },
      ],
    };
  }

  return {
    contents: [
      {
        uri: "model-catalog://models",
        text: JSON.stringify(createCompactCatalogSummary(catalog), null, 2),
      },
    ],
  };
}