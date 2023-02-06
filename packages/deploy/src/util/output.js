import ora from 'ora';
import Table from 'cli-table3';

/**
 * Formats a ZOD error into a human readable string.
 */
export function formatValidationError(error) {
  if (error.issues.length > 0) {
    return error.issues
      .map((issue) => {
        return `- ${issue.path.join('.')}: ${issue.message}`;
      })
      .join('\n');
  }

  return null;
}

/**
 * Formats an AWS error into a human readable string.
 */
export function formatAWSError(error) {
  return `${error.code}: ${error.message}`;
}

/**
 * Outputs an error message and exits the process with non-zero code.
 */
export const panic = (message, { label } = {}) => {
  if (label) {
    console.error(label);
  }
  console.error(message);
  process.exit(1);
};

/**
 * A small util to wrap an async operation with an ora loading spinner.
 */
export const withSpinner = async (message, fn) => {
  const spinner = ora(message).start();
  await fn({
    succeed: () => spinner.succeed(),
    fail: () => spinner.fail(),
    update: (message) => (spinner.text = message),
  });
};

/**
 * Outputs a formatted table to the Command Line.
 */
export const logTable = (head, rows, includeEmptyRow = true) => {
  const table = new Table({ head });
  rows.forEach((row) => table.push(row));
  if (includeEmptyRow) console.log('');
  console.log(table.toString());
};
