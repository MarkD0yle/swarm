import chalk from 'chalk';

// We need to handle chalk v5 ESM in a CommonJS context
// chalk v5 is ESM-only, so we use a dynamic import wrapper approach
// but since tsconfig targets commonjs, we'll use chalk's chalkStderr or similar

export const theme = {
  // Brand colors
  brand: chalk.hex('#00D4AA'),
  brandBold: chalk.hex('#00D4AA').bold,

  // Severity colors
  high: chalk.hex('#FF4757').bold,
  medium: chalk.hex('#FFA502').bold,
  low: chalk.hex('#2ED573').bold,

  // Status colors
  waiting: chalk.hex('#747D8C'),
  analyzing: chalk.hex('#1E90FF'),
  done: chalk.hex('#2ED573'),
  error: chalk.hex('#FF4757'),

  // Agent name colors
  accessibility: chalk.hex('#A29BFE').bold,
  ux: chalk.hex('#FD79A8').bold,
  component: chalk.hex('#FDCB6E').bold,
  styling: chalk.hex('#74B9FF').bold,
  synthesizer: chalk.hex('#00CEC9').bold,

  // General
  dim: chalk.dim,
  bold: chalk.bold,
  white: chalk.white,
  gray: chalk.gray,

  // Box styling
  boxBorder: chalk.hex('#00D4AA'),
  boxTitle: chalk.hex('#00D4AA').bold,

  // Section headers
  sectionHeader: (text: string) => chalk.hex('#00D4AA').bold.underline(text),

  // Severity badge
  severityBadge: (severity: string) => {
    switch (severity) {
      case 'high':
        return chalk.bgHex('#FF4757').white.bold(` HIGH `);
      case 'medium':
        return chalk.bgHex('#FFA502').black.bold(` MED `);
      case 'low':
        return chalk.bgHex('#2ED573').black.bold(` LOW `);
      default:
        return chalk.bgGray.white(` ${severity.toUpperCase()} `);
    }
  },
};
