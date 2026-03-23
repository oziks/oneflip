/**
 * Group management with chrome.storage.local.
 *
 * Data model:
 * {
 *   groups: [{
 *     id: string,
 *     name: string,
 *     color: string (hex),
 *     pattern: string (regex, case-insensitive match on extension name),
 *     extensionIds: string[],
 *     mode: "radio" | "free"
 *   }]
 * }
 */

const STORAGE_KEY = 'groups';

export async function getGroups() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

export async function saveGroups(groups) {
  await chrome.storage.local.set({ [STORAGE_KEY]: groups });
}

export async function getGroup(groupId) {
  const groups = await getGroups();
  return groups.find(g => g.id === groupId) || null;
}

export async function createGroup({ name, color, pattern, mode }) {
  const groups = await getGroups();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const group = {
    id: `${slug}-${Date.now()}`,
    name,
    color: color || '#6366f1',
    pattern: pattern || '',
    extensionIds: [],
    mode: mode || 'radio',
  };
  groups.push(group);
  await saveGroups(groups);
  return group;
}

export async function updateGroup(groupId, updates) {
  const groups = await getGroups();
  const index = groups.findIndex(g => g.id === groupId);
  if (index === -1) return null;
  groups[index] = { ...groups[index], ...updates };
  await saveGroups(groups);
  return groups[index];
}

export async function deleteGroup(groupId) {
  const groups = await getGroups();
  await saveGroups(groups.filter(g => g.id !== groupId));
}

export async function addExtensionToGroup(groupId, extensionId) {
  const groups = await getGroups();
  // Remove from any other group first
  for (const group of groups) {
    group.extensionIds = group.extensionIds.filter(id => id !== extensionId);
  }
  const target = groups.find(g => g.id === groupId);
  if (target && !target.extensionIds.includes(extensionId)) {
    target.extensionIds.push(extensionId);
  }
  await saveGroups(groups);
}

export async function removeExtensionFromGroup(groupId, extensionId) {
  const groups = await getGroups();
  const target = groups.find(g => g.id === groupId);
  if (target) {
    target.extensionIds = target.extensionIds.filter(id => id !== extensionId);
  }
  await saveGroups(groups);
}

/**
 * Scan all extensions and auto-assign to groups based on pattern.
 * Does NOT remove manually assigned extensions.
 */
export async function autoAssignByPattern(extensions) {
  const groups = await getGroups();
  let changed = false;

  for (const group of groups) {
    if (!group.pattern) continue;
    let regex;
    try {
      regex = new RegExp(group.pattern, 'i');
    } catch {
      continue;
    }

    for (const ext of extensions) {
      if (!regex.test(ext.name)) continue;
      if (group.extensionIds.includes(ext.id)) continue;

      // Check not already in another group
      const inOther = groups.some(
        g => g.id !== group.id && g.extensionIds.includes(ext.id)
      );
      if (!inOther) {
        group.extensionIds.push(ext.id);
        changed = true;
      }
    }
  }

  if (changed) await saveGroups(groups);
  return groups;
}
