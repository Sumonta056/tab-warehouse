export function clockText(date, { h24 = false, seconds = true } = {}) {
  const h = date.getHours();
  const hh = h24 ? String(h).padStart(2, '0') : String(h % 12 || 12);
  const mm = String(date.getMinutes()).padStart(2, '0');
  return seconds ? `${hh}:${mm}:${String(date.getSeconds()).padStart(2, '0')}` : `${hh}:${mm}`;
}

export function msToNextTick(date, seconds = true) {
  const ms = date.getMilliseconds();
  return seconds ? 1000 - ms : 60000 - date.getSeconds() * 1000 - ms;
}
