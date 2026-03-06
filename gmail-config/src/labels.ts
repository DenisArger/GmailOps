import { gmail_v1 } from "googleapis";
import { listLabels } from "./gmail";

export async function ensureLabels(
  gmail: gmail_v1.Gmail,
  labelNames: string[],
): Promise<Map<string, string>> {
  const labels = await listLabels(gmail);
  const labelMap = new Map<string, string>();

  for (const label of labels) {
    if (label.name && label.id) {
      labelMap.set(label.name, label.id);
    }
  }

  for (const labelName of labelNames) {
    const existingId = labelMap.get(labelName);
    if (existingId) {
      console.log(`✓ label ${labelName} exists`);
      continue;
    }

    const response = await gmail.users.labels.create({
      userId: "me",
      requestBody: {
        name: labelName,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
        type: "user",
      },
    });

    const created = response.data;
    if (!created.id || !created.name) {
      throw new Error(`Gmail did not return an id for newly created label "${labelName}".`);
    }

    labelMap.set(created.name, created.id);
    console.log(`✓ label ${labelName} created`);
  }

  return labelMap;
}
