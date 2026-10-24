export function capitalize(s) {
  return `${s[0].toUpperCase()}${s.slice(1)}`;
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
