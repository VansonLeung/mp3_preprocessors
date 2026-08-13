import { spawn } from "node:child_process";

export function spawnCommandAdapter({
  command,
  args,
  workingDirectoryPath,
  callbacks,
}) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      cwd: workingDirectoryPath,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    childProcess.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      callbacks?.onCommandStdout?.({ command, text });
    });

    childProcess.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      callbacks?.onCommandStderr?.({ command, text });
    });

    childProcess.on("error", (error) => {
      reject(error);
    });

    childProcess.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr, exitCode });
        return;
      }

      const error = new Error(
        `${command} failed with exit code ${exitCode}: ${stderr.slice(-1000)}`,
      );
      error.exitCode = exitCode;
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}
