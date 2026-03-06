import fs from "node:fs";
import path from "node:path";
import { gmail_v1 } from "googleapis";
import { ensureFilters } from "./filters";
import { ensureLabels } from "./labels";

export type FilterRule = {
  query: string;
  label: string;
  archive: boolean;
};

export type RulesConfig = {
  labels: string[];
  filters: FilterRule[];
};

function getRulesPath(): string {
  const configuredPath = process.env.GMAIL_RULES_PATH?.trim();
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  const candidates = [
    path.resolve(process.cwd(), "config", "rules.json"),
    path.resolve(__dirname, "..", "config", "rules.json"),
    path.resolve(__dirname, "..", "..", "config", "rules.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function loadRulesConfig(): RulesConfig {
  const rulesPath = getRulesPath();

  if (!fs.existsSync(rulesPath)) {
    throw new Error(`rules.json not found at ${rulesPath}.`);
  }

  const raw = fs.readFileSync(rulesPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<RulesConfig>;

  if (!Array.isArray(parsed.labels)) {
    throw new Error("rules.json must contain a labels array.");
  }

  if (!Array.isArray(parsed.filters)) {
    throw new Error("rules.json must contain a filters array.");
  }

  const labels = parsed.labels.map((label, index) => {
    if (!isNonEmptyString(label)) {
      throw new Error(`labels[${index}] must be a non-empty string.`);
    }
    return label.trim();
  });

  const labelSet = new Set(labels);

  const filters = parsed.filters.map((filter, index) => {
    if (!filter || typeof filter !== "object") {
      throw new Error(`filters[${index}] must be an object.`);
    }

    const query = (filter as FilterRule).query;
    const label = (filter as FilterRule).label;
    const archive = (filter as FilterRule).archive;

    if (!isNonEmptyString(query)) {
      throw new Error(`filters[${index}].query must be a non-empty string.`);
    }

    if (!isNonEmptyString(label)) {
      throw new Error(`filters[${index}].label must be a non-empty string.`);
    }

    if (typeof archive !== "boolean") {
      throw new Error(`filters[${index}].archive must be a boolean.`);
    }

    const normalizedLabel = label.trim();
    if (!labelSet.has(normalizedLabel)) {
      throw new Error(`filters[${index}].label references unknown label "${normalizedLabel}".`);
    }

    return {
      query: query.trim(),
      label: normalizedLabel,
      archive,
    };
  });

  return { labels, filters };
}

export async function applyConfig(gmail: gmail_v1.Gmail): Promise<void> {
  const config = loadRulesConfig();
  const labelMap = await ensureLabels(gmail, config.labels);
  await ensureFilters(gmail, config.filters, labelMap);
}
