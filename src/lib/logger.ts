type LogFields = Record<string, unknown>;

function format(level: string, message: string, fields?: LogFields) {
  return JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  });
}

export const logger = {
  info(message: string, fields?: LogFields) {
    console.log(format("info", message, fields));
  },
  warn(message: string, fields?: LogFields) {
    console.warn(format("warn", message, fields));
  },
  error(message: string, fields?: LogFields) {
    console.error(format("error", message, fields));
  },
};
