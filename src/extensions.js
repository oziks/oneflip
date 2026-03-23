/**
 * Wrapper around chrome.management API.
 * Filters out self and themes — only returns real extensions.
 */

const SELF_ID = chrome.runtime.id;

export async function getAllExtensions() {
  const all = await chrome.management.getAll();
  return all.filter(ext => ext.id !== SELF_ID && ext.type === 'extension');
}

export async function setEnabled(extensionId, enabled) {
  return chrome.management.setEnabled(extensionId, enabled);
}

export async function getExtension(extensionId) {
  try {
    return await chrome.management.get(extensionId);
  } catch {
    return null;
  }
}

export function getIconUrl(ext, size = 32) {
  if (!ext.icons || ext.icons.length === 0) return null;
  const sorted = [...ext.icons].sort((a, b) => b.size - a.size);
  const match = sorted.find(i => i.size >= size) || sorted[0];
  return match.url;
}
