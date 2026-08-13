import fs from "node:fs";
import path from "node:path";
import { createEnvironmentConfigurationModel } from "../models/EnvironmentConfigurationModel.js";

function parseDotEnvLine(dotEnvLine) {
  const trimmedLine = dotEnvLine.trim();

  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return null;
  }

  const equalsIndex = trimmedLine.indexOf("=");
  if (equalsIndex === -1) {
    return null;
  }

  const key = trimmedLine.slice(0, equalsIndex).trim();
  let value = trimmedLine.slice(equalsIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function readDotEnvFileIfPresent(dotEnvFilePath) {
  if (!fs.existsSync(dotEnvFilePath)) {
    return {};
  }

  const parsedEnvironmentVariables = {};
  const dotEnvContents = fs.readFileSync(dotEnvFilePath, "utf8");

  for (const dotEnvLine of dotEnvContents.split(/\r?\n/)) {
    const parsedLine = parseDotEnvLine(dotEnvLine);
    if (parsedLine) {
      parsedEnvironmentVariables[parsedLine.key] = parsedLine.value;
    }
  }

  return parsedEnvironmentVariables;
}

export function loadEnvironmentConfiguration({ workspaceDirectoryPath }) {
  const dotEnvFilePath = path.join(workspaceDirectoryPath, ".env");
  const dotEnvEnvironmentVariables = readDotEnvFileIfPresent(dotEnvFilePath);

  return createEnvironmentConfigurationModel({
    environmentVariables: {
      ...dotEnvEnvironmentVariables,
      ...process.env,
    },
    workspaceDirectoryPath,
  });
}
