import { jsonrepair } from "jsonrepair";

function extractJsonObjectText(text) {
  const firstBraceIndex = text.indexOf("{");
  const lastBraceIndex = text.lastIndexOf("}");

  if (firstBraceIndex === -1) {
    throw new Error("Unable to find a JSON object in LLM response.");
  }

  if (lastBraceIndex === -1 || lastBraceIndex < firstBraceIndex) {
    return text.slice(firstBraceIndex);
  }

  return text.slice(firstBraceIndex, lastBraceIndex + 1);
}

function parseJsonObjectWithRepair(text) {
  return JSON.parse(jsonrepair(text));
}

export function parseJsonObjectFromPossiblyMessyText(text) {
  try {
    return JSON.parse(text);
  } catch {}

  const extractedJsonObjectText = extractJsonObjectText(text);

  try {
    return JSON.parse(extractedJsonObjectText);
  } catch {
    return parseJsonObjectWithRepair(extractedJsonObjectText);
  }
}
