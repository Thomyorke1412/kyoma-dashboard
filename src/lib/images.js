export function describeImageState({ hasImage, resolvedUrl, failed, missing }) {
  if (!hasImage) return 'empty'
  if (resolvedUrl) return failed ? 'failed' : 'ok'
  if (missing) return 'missing'
  return 'loading'
}

export function isMissingBlob(ref, resolvedUrl, settled) {
  return Boolean(ref?.type === 'idb' && ref.value) && Boolean(settled) && !resolvedUrl
}
