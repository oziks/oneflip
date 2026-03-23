import { autoAssignByPattern } from '../src/groups.js';
import { getAllExtensions } from '../src/extensions.js';

// Auto-assign on install/update
chrome.runtime.onInstalled.addListener(async () => {
  const extensions = await getAllExtensions();
  await autoAssignByPattern(extensions);
});

// Auto-assign when a new extension is installed
chrome.management.onInstalled.addListener(async (info) => {
  if (info.type !== 'extension') return;
  const extensions = await getAllExtensions();
  await autoAssignByPattern(extensions);
});
