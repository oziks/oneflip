import { getGroups, autoAssignByPattern } from '../src/groups.js';
import { getAllExtensions, setEnabled, getIconUrl } from '../src/extensions.js';

let extensions = [];
let groups = [];

// --- Init ---

async function init() {
  extensions = await getAllExtensions();
  groups = await autoAssignByPattern(extensions);
  render();
}

// --- Render ---

function render() {
  const groupsEl = document.getElementById('groups');
  const ungroupedEl = document.getElementById('ungrouped');
  const ungroupedCount = document.getElementById('ungrouped-count');
  const ungroupedSection = document.getElementById('ungrouped-section');

  groupsEl.innerHTML = '';
  ungroupedEl.innerHTML = '';

  const groupedIds = new Set(groups.flatMap(g => g.extensionIds));

  // Render groups
  for (const group of groups) {
    const groupExts = group.extensionIds
      .map(id => extensions.find(e => e.id === id))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (groupExts.length === 0) continue;
    groupsEl.appendChild(renderGroup(group, groupExts));
  }

  if (groupsEl.children.length === 0) {
    groupsEl.innerHTML = `
      <div class="empty-state">
        <strong>No groups yet</strong>
        <p>Open settings to create extension groups</p>
      </div>
    `;
  }

  // Render ungrouped
  const ungroupedExts = extensions
    .filter(e => !groupedIds.has(e.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  ungroupedCount.textContent = `(${ungroupedExts.length})`;
  ungroupedSection.style.display = ungroupedExts.length > 0 ? '' : 'none';

  for (const ext of ungroupedExts) {
    ungroupedEl.appendChild(renderExtRow(ext, null));
  }
}

function renderGroup(group, exts) {
  const section = document.createElement('div');
  section.className = 'group';
  section.innerHTML = `
    <div class="group-header">
      <span class="group-dot" style="background: ${group.color}"></span>
      <span class="group-name">${escapeHtml(group.name)}</span>
      <span class="group-mode">${group.mode === 'radio' ? 'one at a time' : 'independent'}</span>
    </div>
  `;

  for (const ext of exts) {
    section.appendChild(renderExtRow(ext, group));
  }

  return section;
}

function renderExtRow(ext, group) {
  const row = document.createElement('div');
  row.className = `ext-row${ext.enabled ? ' active' : ' disabled'}`;

  const iconUrl = getIconUrl(ext, 32);
  const iconHtml = iconUrl
    ? `<img src="${iconUrl}" alt="">`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>`;

  const badge = detectBadge(ext);
  const badgeHtml = badge
    ? `<span class="ext-badge ${badge.class}">${badge.label}</span>`
    : '';

  const isUnpacked = ext.installType === 'development' && !ext.updateUrl;
  const showReload = isUnpacked && ext.enabled;
  const reloadHtml = showReload
    ? `<button class="reload-btn" title="Reload from disk">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>`
    : '';

  row.innerHTML = `
    <div class="ext-icon">${iconHtml}</div>
    <div class="ext-info">
      <div class="ext-name">${escapeHtml(ext.name)}</div>
      <div class="ext-version">${ext.version || ''}</div>
    </div>
    ${badgeHtml}
    ${reloadHtml}
    <div class="toggle"></div>
  `;

  const reloadBtn = row.querySelector('.reload-btn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleReload(ext, reloadBtn);
    });
  }
  row.addEventListener('click', () => handleToggle(ext, group, row));
  return row;
}

function detectBadge(ext) {
  if (ext.installType === 'development') {
    if (!ext.updateUrl) {
      return { label: 'unpacked', class: 'unpacked' };
    }
    return { label: 'dev', class: 'dev' };
  }
  if (ext.installType === 'normal') {
    return { label: 'prod', class: 'prod' };
  }
  return null;
}

// --- Actions ---

async function handleReload(ext, btn) {
  btn?.classList.add('spinning');
  await setEnabled(ext.id, false);
  await new Promise(r => setTimeout(r, 300));
  await setEnabled(ext.id, true);
  extensions = await getAllExtensions();
  render();
}

async function handleToggle(ext, group, row) {
  const willEnable = !ext.enabled;

  if (group && group.mode === 'radio') {
    for (const otherId of group.extensionIds) {
      if (otherId !== ext.id) {
        try { await setEnabled(otherId, false); } catch {}
      }
    }
    try { await setEnabled(ext.id, willEnable); } catch {}
  } else {
    try { await setEnabled(ext.id, willEnable); } catch {}
  }

  // Flash feedback
  row.classList.add(willEnable ? 'flash-on' : 'flash-off');

  extensions = await getAllExtensions();
  render();
}

// --- Chrome extensions link ---

document.getElementById('open-chrome-ext').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions' });
});

// --- Settings button ---

document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// --- Util ---

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Go ---

init();
