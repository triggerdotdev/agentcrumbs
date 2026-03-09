// ANSI 256-color palette indices chosen for readability on dark/light terminals
const COLORS = [
  6, 2, 3, 4, 5, 1, 9, 10, 11, 12, 13, 14, 208, 196, 202, 170,
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getNamespaceColor(namespace: string): number {
  return COLORS[hashString(namespace) % COLORS.length]!;
}

export function colorize(text: string, colorIndex: number): string {
  return `\x1b[38;5;${colorIndex}m${text}\x1b[0m`;
}

export function dim(text: string): string {
  return `\x1b[2m${text}\x1b[0m`;
}

export function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`;
}
