type LogContext = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, context?: LogContext): void {
  if (process.env.NODE_ENV === "test" && level !== "error") return;

  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`;
  if (context) {
    console[level](line, context);
    return;
  }
  console[level](line);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
