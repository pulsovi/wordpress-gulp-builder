/** Convert text to Pascal Case string */
export function pascalify (text: string): string {
  return text
    .replace(/(?<=\b|[a-z])([A-Z])/gu, ' $1')
    .replace(/[^a-zA-Z0-9_]*/gu, ' ')
    .toLowerCase()
    .replace(/(?<=^|[-_ ])([a-z])/gu, (match, capture) => capture.toUpperCase())
    .replace(/ |-|_/gu, '');
}

/** Convert text to kebab case string */
export function kebabify (text: string): string {
  return text
    .replace(/(?<=\b|[a-z])([A-Z])/gu, ' $1')
    .toLowerCase()
    .replace(/^[- _]*/, '')
    .replace(/[- _]*$/, '')
    .replace(/([-_ ]+)/gu, '-');
}
