export function imageSaveError(err) {
  return /quota/i.test(err?.message || '')
    ? 'Not enough storage space. Remove the background image or some custom icons, then try again.'
    : 'That file is not an image the browser can read.';
}
