import { formatError, runCommand } from "./runtime";

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command || !["apply", "list"].includes(command)) {
    throw new Error("Usage: node dist/index.js <apply|list>");
  }
  await runCommand(command as "apply" | "list");
}

main().catch((error) => {
  console.error(`Error: ${formatError(error)}`);
  process.exitCode = 1;
});
