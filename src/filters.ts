import { GaxiosError } from "gaxios";
import { gmail_v1 } from "googleapis";
import { listFilters } from "./gmail";
import { FilterRule } from "./applyConfig";

function hasInboxRemoval(action?: gmail_v1.Schema$FilterAction): boolean {
  return (action?.removeLabelIds ?? []).includes("INBOX");
}

function hasLabel(action: gmail_v1.Schema$FilterAction | undefined, labelId: string): boolean {
  return (action?.addLabelIds ?? []).includes(labelId);
}

function filterExists(
  existingFilters: gmail_v1.Schema$Filter[],
  query: string,
  labelId: string,
  archive: boolean,
): boolean {
  return existingFilters.some((filter) => {
    const existingQuery = filter.criteria?.query ?? "";
    return (
      existingQuery === query &&
      hasLabel(filter.action, labelId) &&
      hasInboxRemoval(filter.action) === archive
    );
  });
}

function isDuplicateError(error: unknown): boolean {
  if (!(error instanceof GaxiosError)) {
    return false;
  }

  const status = error.response?.status;
  const message = String(error.response?.data ?? error.message).toLowerCase();
  return status === 409 || message.includes("already exists") || message.includes("duplicate");
}

function isInvalidQueryError(error: unknown): boolean {
  if (!(error instanceof GaxiosError)) {
    return false;
  }

  const message = String(error.response?.data ?? error.message).toLowerCase();
  return error.response?.status === 400 && message.includes("query");
}

export async function ensureFilters(
  gmail: gmail_v1.Gmail,
  rules: FilterRule[],
  labelMap: Map<string, string>,
): Promise<void> {
  const existingFilters = await listFilters(gmail);

  for (const rule of rules) {
    const labelId = labelMap.get(rule.label);
    if (!labelId) {
      throw new Error(`Label "${rule.label}" was not resolved to a Gmail label id.`);
    }

    if (filterExists(existingFilters, rule.query, labelId, rule.archive)) {
      console.log(`✓ filter for ${rule.query} exists`);
      continue;
    }

    try {
      const action: gmail_v1.Schema$FilterAction = {
        addLabelIds: [labelId],
      };

      if (rule.archive) {
        action.removeLabelIds = ["INBOX"];
      }

      await gmail.users.settings.filters.create({
        userId: "me",
        requestBody: {
          criteria: {
            query: rule.query,
          },
          action,
        },
      });

      existingFilters.push({
        criteria: { query: rule.query },
        action,
      });
      console.log(`✓ filter for ${rule.query} created`);
    } catch (error) {
      if (isDuplicateError(error)) {
        console.log(`✓ filter for ${rule.query} exists`);
        continue;
      }

      if (isInvalidQueryError(error)) {
        throw new Error(`Invalid Gmail query syntax for "${rule.query}".`);
      }

      throw error;
    }
  }
}

export async function printFilters(gmail: gmail_v1.Gmail): Promise<void> {
  const filters = await listFilters(gmail);

  if (filters.length === 0) {
    console.log("No filters found.");
    return;
  }

  for (const [index, filter] of filters.entries()) {
    const query = filter.criteria?.query ?? "(no query)";
    const addLabels = (filter.action?.addLabelIds ?? []).join(", ") || "-";
    const removeLabels = (filter.action?.removeLabelIds ?? []).join(", ") || "-";
    console.log(`${index + 1}. query=${query} add=[${addLabels}] remove=[${removeLabels}]`);
  }
}
