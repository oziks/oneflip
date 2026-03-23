import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addExtensionToGroup,
  removeExtensionFromGroup,
  autoAssignByPattern,
} from '../src/groups.js';
import { getAllExtensions, getIconUrl } from '../src/extensions.js';

let extensions = [];
let groups = [];

// --- Init ---

async function init() {
  extensions = await getAllExtensions();
  groups = await getGroups();
  renderGroups();
  renderExtensions();
}

// --- Create group ---

document.getElementById('create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('group-name').value.trim();
  const pattern = document.getElementById('group-pattern').value.trim();
  const color = document.getElementById('group-color').value;
  const mode = document.getElementById('group-mode').value;

  if (!name) return;

  await createGroup({ name, pattern, color, mode });

  // Auto-assign if pattern was set
  if (pattern) {
    await autoAssignByPattern(extensions);
  }

  // Reset form
  e.target.reset();
  document.getElementById('group-color').value = '#6366f1';

  await refresh();
  toast(`Group "${name}" created`);
});

// --- Render groups ---

function renderGroups() {
  const list = document.getElementById('groups-list');
  list.innerHTML = '';

  if (groups.length === 0) {
    list.innerHTML = '<div class="card"><p class="hint">No groups yet. Create one above.</p></div>';
    return;
  }

  for (const group of groups) {
    list.appendChild(renderGroupCard(group));
  }
}

function renderGroupCard(group) {
  const card = document.createElement('div');
  card.className = 'group-card';
  card.dataset.groupId = group.id;

  const groupExts = group.extensionIds
    .map(id => extensions.find(e => e.id === id))
    .filter(Boolean);

  const chipsHtml = groupExts.length > 0
    ? groupExts.map(ext => {
        const iconUrl = getIconUrl(ext, 16);
        const iconHtml = iconUrl ? `<img src="${iconUrl}" alt="">` : '';
        return `
          <span class="ext-chip" data-ext-id="${ext.id}">
            ${iconHtml}
            ${escapeHtml(ext.name)}
            <span class="remove-ext" title="Remove from group">&times;</span>
          </span>
        `;
      }).join('')
    : '<span class="group-card-empty">No extensions matched yet</span>';

  card.innerHTML = `
    <div class="group-card-header">
      <span class="group-card-dot" style="background: ${group.color}"></span>
      <span class="group-card-name">${escapeHtml(group.name)}</span>
      <span class="group-card-meta">${group.mode === 'radio' ? 'radio' : 'free'} · pattern: ${escapeHtml(group.pattern || 'none')}</span>
      <div class="group-card-actions">
        <button class="btn ghost edit-group-btn" title="Edit">Edit</button>
        <button class="btn ghost danger delete-group-btn" title="Delete">&times;</button>
      </div>
    </div>
    <div class="group-card-body">${chipsHtml}</div>
    <div class="group-edit" id="edit-${group.id}">
      <div class="form-row">
        <div class="field">
          <label>Name</label>
          <input type="text" class="edit-name" value="${escapeAttr(group.name)}">
        </div>
        <div class="field">
          <label>Pattern</label>
          <input type="text" class="edit-pattern" value="${escapeAttr(group.pattern)}">
        </div>
        <div class="field small">
          <label>Color</label>
          <input type="color" class="edit-color" value="${group.color}">
        </div>
        <div class="field">
          <label>Mode</label>
          <select class="edit-mode">
            <option value="radio" ${group.mode === 'radio' ? 'selected' : ''}>Radio</option>
            <option value="free" ${group.mode === 'free' ? 'selected' : ''}>Free</option>
          </select>
        </div>
      </div>
      <button class="btn primary save-edit-btn">Save</button>
    </div>
  `;

  // Edit toggle
  card.querySelector('.edit-group-btn').addEventListener('click', () => {
    const editEl = card.querySelector('.group-edit');
    editEl.classList.toggle('open');
  });

  // Save edit
  card.querySelector('.save-edit-btn').addEventListener('click', async () => {
    await updateGroup(group.id, {
      name: card.querySelector('.edit-name').value.trim(),
      pattern: card.querySelector('.edit-pattern').value.trim(),
      color: card.querySelector('.edit-color').value,
      mode: card.querySelector('.edit-mode').value,
    });
    await autoAssignByPattern(extensions);
    await refresh();
    toast('Group updated');
  });

  // Delete — inline confirmation
  const deleteBtn = card.querySelector('.delete-group-btn');
  deleteBtn.addEventListener('click', () => {
    if (deleteBtn.dataset.confirm) {
      // Second click = confirmed
      deleteGroup(group.id).then(() => { refresh(); toast('Group deleted'); });
    } else {
      deleteBtn.dataset.confirm = '1';
      deleteBtn.textContent = 'confirm?';
      deleteBtn.classList.add('confirming');
      setTimeout(() => {
        delete deleteBtn.dataset.confirm;
        deleteBtn.textContent = '×';
        deleteBtn.classList.remove('confirming');
      }, 3000);
    }
  });

  // Remove extension from group
  card.querySelectorAll('.remove-ext').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const chip = btn.closest('.ext-chip');
      const extId = chip.dataset.extId;
      await removeExtensionFromGroup(group.id, extId);
      await refresh();
    });
  });

  // Drag & drop target
  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    card.classList.add('drop-target');
  });
  card.addEventListener('dragleave', () => {
    card.classList.remove('drop-target');
  });
  card.addEventListener('drop', async (e) => {
    e.preventDefault();
    card.classList.remove('drop-target');
    const extId = e.dataTransfer.getData('text/extension-id');
    if (extId) {
      await addExtensionToGroup(group.id, extId);
      await refresh();
      toast('Extension added to group');
    }
  });

  return card;
}

// --- Render extensions ---

function renderExtensions() {
  const list = document.getElementById('extensions-list');
  list.innerHTML = '';

  // Build a map: extId -> groupId
  const extGroupMap = {};
  for (const group of groups) {
    for (const extId of group.extensionIds) {
      extGroupMap[extId] = group.id;
    }
  }

  for (const ext of extensions) {
    const item = document.createElement('div');
    item.className = 'ext-list-item';
    item.draggable = true;

    const iconUrl = getIconUrl(ext, 24);
    const iconHtml = iconUrl
      ? `<img src="${iconUrl}" alt="">`
      : '';

    const installType = ext.installType === 'development'
      ? (ext.updateUrl ? 'dev' : 'unpacked')
      : ext.installType;

    const groupOptions = groups
      .map(g => `<option value="${g.id}" ${extGroupMap[ext.id] === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`)
      .join('');

    item.innerHTML = `
      <div class="ext-list-icon">${iconHtml}</div>
      <span class="ext-list-name">${escapeHtml(ext.name)}</span>
      <span class="ext-list-type">${installType}</span>
      <div class="ext-list-assign">
        <select data-ext-id="${ext.id}">
          <option value="">— no group —</option>
          ${groupOptions}
        </select>
      </div>
    `;

    // Drag start
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/extension-id', ext.id);
      e.dataTransfer.effectAllowed = 'move';
    });

    // Assign via select
    item.querySelector('select').addEventListener('change', async (e) => {
      const groupId = e.target.value;
      if (groupId) {
        await addExtensionToGroup(groupId, ext.id);
      } else {
        // Remove from current group
        const currentGroupId = extGroupMap[ext.id];
        if (currentGroupId) {
          await removeExtensionFromGroup(currentGroupId, ext.id);
        }
      }
      await refresh();
    });

    list.appendChild(item);
  }
}

// --- Helpers ---

async function refresh() {
  extensions = await getAllExtensions();
  groups = await getGroups();
  renderGroups();
  renderExtensions();
}

function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// --- Go ---

init();
