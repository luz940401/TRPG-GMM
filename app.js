const sceneTitle = document.getElementById('scene-title');
const sceneDescription = document.getElementById('scene-description');
const optionsList = document.getElementById('options-list');
const currentNode = document.getElementById('current-node');
const completedCount = document.getElementById('completed-count');
const pendingCount = document.getElementById('pending-count');
const treeDrawer = document.getElementById('tree-drawer');
const treeList = document.getElementById('tree-list');
const openTree = document.getElementById('open-tree');
const closeTree = document.getElementById('close-tree');
const resetProgress = document.getElementById('reset-progress');
const goBack = document.getElementById('go-back');
const openEditorBtn = document.getElementById('open-editor');
const closeEditorBtn = document.getElementById('close-editor-btn');
const editorOverlay = document.getElementById('editor-overlay');
const outlineListEl = document.getElementById('outline-list');
const editorFormPanel = document.getElementById('editor-form-panel');
const addNodeBtn = document.getElementById('add-node-btn');

const defaultNodes = {
  entrance: {
    id: 'entrance',
    title: '古老神殿入口',
    description: '你們站在古老神殿的入口前，石階上長滿青苔，空氣中瀰漫著灰塵與沉寂。前方的門上刻著一個古老符號，似乎等待觸發。',
    options: [
      { label: '檢查門上的符號', next: 'symbol' },
      { label: '繞到側邊尋找另一個入口', next: 'sideEntrance' },
      { label: '直接敲門引起注意', next: 'knock' }
    ]
  },
  symbol: {
    id: 'symbol',
    title: '符號解讀',
    description: '符號閃爍著微弱光芒，當你觸碰它時，神殿門緩緩打開，卻同時傳來一陣低沉的機關聲。',
    options: [
      { label: '進入神殿', next: 'innerHall' },
      { label: '退後等待同伴', next: 'wait' }
    ]
  },
  sideEntrance: {
    id: 'sideEntrance',
    title: '側門發現',
    description: '你發現側面有一扇被藤蔓遮蓋的小門，門縫透出一絲光亮，似乎不是主入口。',
    options: [
      { label: '推開小門查看', next: 'hiddenPassage' },
      { label: '繼續通往主門', next: 'entrance' }
    ]
  },
  knock: {
    id: 'knock',
    title: '敲門',
    description: '你用力敲門，回音在神殿裡擴散。片刻後，從門內傳出一個冷酷的聲音：「誰在外面？」',
    options: [
      { label: '自我介紹並申請進入', next: 'introduce' },
      { label: '假裝是迷路者', next: 'lie' }
    ]
  },
  innerHall: {
    id: 'innerHall',
    title: '神殿內廳',
    description: '你們進入神殿內廳，四周擺滿雕像，中央是一個發光的祭壇。空氣依舊冰冷，仿佛有人在暗中注視。',
    options: [
      { label: '檢查祭壇', next: 'altar' },
      { label: '探索雕像周圍', next: 'statues' }
    ]
  },
  wait: {
    id: 'wait',
    title: '等待同伴',
    description: '你選擇退後，等待隊友的反應。這時神殿內隱約傳來腳步聲，一扇祕密門悄然開啟。',
    options: [
      { label: '偷偷跟進秘密門', next: 'secretDoor' },
      { label: '呼叫隊友進入主門', next: 'innerHall' }
    ]
  }
};

let storyNodes = (() => {
  try {
    const saved = localStorage.getItem('trpg_nodes');
    return saved ? JSON.parse(saved) : { ...defaultNodes };
  } catch {
    return { ...defaultNodes };
  }
})();

let history = [];
let activeNode = storyNodes.entrance;

function renderScene(node) {
  sceneTitle.textContent = node.title;
  sceneDescription.innerHTML = node.description;
  currentNode.textContent = node.id;
  optionsList.innerHTML = '';
  goBack.disabled = history.length === 0;

  node.options.forEach((option, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'option-wrapper';

    const button = document.createElement('button');
    button.className = 'option-button';
    button.innerHTML = `<strong>${escHtml(option.label)}</strong><span>下一步：${storyNodes[option.next]?.title ?? '⚠ 節點未定義'}</span>`;
    button.addEventListener('click', () => chooseOption(option));

    const editBtn = document.createElement('button');
    editBtn.className = 'option-edit-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = '編輯選項';
    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      showInlineOptionEditor(wrapper, option, idx, node);
    });

    wrapper.append(button, editBtn);
    optionsList.append(wrapper);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'add-option-btn';
  addBtn.textContent = '＋ 新增選項';
  addBtn.addEventListener('click', () => openQCPanel(node));
  optionsList.append(addBtn);

  updateStatus();
}

function showInlineOptionEditor(wrapper, option, idx, node) {
  const nodeOpts = Object.values(storyNodes)
    .map(n => `<option value="${n.id}" ${n.id === option.next ? 'selected' : ''}>${escHtml(n.title)}</option>`)
    .join('');

  wrapper.innerHTML = `
    <div class="inline-option-editor">
      <input class="ioe-label" value="${escHtml(option.label)}" placeholder="選項文字" />
      <select class="ioe-next">
        <option value="">— 選擇下一節點 —</option>
        ${nodeOpts}
      </select>
      <button class="ioe-save" title="儲存">✓</button>
      <button class="ioe-delete" title="刪除選項">✕</button>
    </div>
  `;

  wrapper.querySelector('.ioe-save').addEventListener('click', () => {
    const label = wrapper.querySelector('.ioe-label').value.trim();
    const next = wrapper.querySelector('.ioe-next').value;
    if (!label) return;
    node.options[idx] = { label, next };
    saveToStorage();
    renderScene(node);
  });

  wrapper.querySelector('.ioe-delete').addEventListener('click', () => {
    node.options.splice(idx, 1);
    saveToStorage();
    renderScene(node);
  });

  wrapper.querySelector('.ioe-label').addEventListener('keydown', e => {
    if (e.key === 'Enter') wrapper.querySelector('.ioe-save').click();
    if (e.key === 'Escape') renderScene(node);
  });

  wrapper.querySelector('.ioe-label').focus();
  wrapper.querySelector('.ioe-label').select();
}

function chooseOption(option) {
  if (!storyNodes[option.next]) return;
  history.push(activeNode.id);
  activeNode = storyNodes[option.next];
  renderScene(activeNode);
}

function updateStatus() {
  completedCount.textContent = history.length;
  pendingCount.textContent = Math.max(0, Object.keys(storyNodes).length - history.length - 1);
}

// ── Mind map ─────────────────────────────────────────────────────────────────

const MM_W = 160, MM_H = 50, H_STEP = 220, V_STEP = 74;
const DEPTH_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#f97316'];
let mmScale = 1, mmPanX = 40, mmPanY = 40, mmDragging = false, mmLastDist = 0;

function svgEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

function buildMMLayout() {
  const visited = new Set(), nodeMap = {}, edges = [], all = [];

  function build(id, parentId, depth) {
    if (visited.has(id) || !storyNodes[id]) return;
    visited.add(id);
    const n = { id, depth, parentId, title: storyNodes[id].title, children: [], x: 0, y: 0, leaves: 0 };
    nodeMap[id] = n; all.push(n);
    if (parentId) edges.push({ from: parentId, to: id, depth });
    storyNodes[id].options.forEach(o => { if (o.next) build(o.next, id, depth + 1); });
    n.children = storyNodes[id].options.filter(o => o.next && nodeMap[o.next]).map(o => o.next);
  }

  const root = storyNodes.entrance ? 'entrance' : Object.keys(storyNodes)[0];
  if (root) build(root, null, 0);

  function countLeaves(id) {
    const n = nodeMap[id]; if (!n) return 0;
    n.leaves = n.children.length === 0 ? 1 : n.children.reduce((s, c) => s + countLeaves(c), 0);
    return n.leaves;
  }
  if (root) countLeaves(root);

  function place(id, sy) {
    const n = nodeMap[id]; if (!n) return sy;
    const h = n.leaves * V_STEP;
    n.x = n.depth * H_STEP + 20;
    n.y = sy + h / 2 - MM_H / 2;
    let cy = sy;
    n.children.forEach(c => { place(c, cy); cy += nodeMap[c].leaves * V_STEP; });
    return sy + h;
  }
  if (root) place(root, 20);

  const maxY = all.reduce((m, n) => Math.max(m, n.y + MM_H), 0) + V_STEP * 2;
  let ox = 20;
  Object.keys(storyNodes).filter(id => !visited.has(id)).forEach(id => {
    const n = { id, depth: 0, parentId: null, title: storyNodes[id].title, children: [], x: ox, y: maxY, leaves: 1, orphan: true };
    nodeMap[id] = n; all.push(n); ox += H_STEP;
  });

  return { nodes: all, edges, nodeMap };
}

function renderMindMap() {
  const svg = document.getElementById('mindmap-svg');
  if (!svg) return;
  svg.innerHTML = '';

  const { nodes, edges, nodeMap } = buildMMLayout();
  const vp = svgEl('g');
  vp.id = 'mm-vp';
  vp.setAttribute('transform', `translate(${mmPanX},${mmPanY}) scale(${mmScale})`);
  svg.append(vp);

  // Edges
  edges.forEach(({ from, to, depth }) => {
    const fn = nodeMap[from], tn = nodeMap[to]; if (!fn || !tn) return;
    const x1 = fn.x + MM_W, y1 = fn.y + MM_H / 2;
    const x2 = tn.x,        y2 = tn.y + MM_H / 2;
    const cx = (x1 + x2) / 2;
    const col = DEPTH_COLORS[Math.min(depth - 1, DEPTH_COLORS.length - 1)];
    const p = svgEl('path');
    p.setAttribute('d', `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', col);
    p.setAttribute('stroke-width', '1.8');
    p.setAttribute('opacity', '0.45');
    vp.append(p);
  });

  // Nodes
  nodes.forEach(node => {
    const isActive = node.id === activeNode?.id;
    const col = node.orphan ? '#ef4444' : DEPTH_COLORS[Math.min(node.depth, DEPTH_COLORS.length - 1)];
    const g = svgEl('g');
    g.style.cursor = 'pointer';

    if (isActive) {
      const glow = svgEl('rect');
      glow.setAttribute('x', node.x - 4); glow.setAttribute('y', node.y - 4);
      glow.setAttribute('width', MM_W + 8); glow.setAttribute('height', MM_H + 8);
      glow.setAttribute('rx', '14'); glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', col); glow.setAttribute('stroke-width', '3');
      glow.setAttribute('opacity', '0.6');
      g.append(glow);
    }

    const rect = svgEl('rect');
    rect.setAttribute('x', node.x); rect.setAttribute('y', node.y);
    rect.setAttribute('width', MM_W); rect.setAttribute('height', MM_H);
    rect.setAttribute('rx', '10');
    rect.setAttribute('fill', isActive ? col + '33' : '#12151900');
    rect.setAttribute('stroke', isActive ? col : col + '77');
    rect.setAttribute('stroke-width', isActive ? '2' : '1.5');
    rect.style.filter = 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))';
    g.append(rect);

    // Backdrop for readability
    const bg = svgEl('rect');
    bg.setAttribute('x', node.x); bg.setAttribute('y', node.y);
    bg.setAttribute('width', MM_W); bg.setAttribute('height', MM_H);
    bg.setAttribute('rx', '10'); bg.setAttribute('fill', 'rgba(13,17,22,0.88)');
    g.insertBefore(bg, rect);

    const dot = svgEl('circle');
    dot.setAttribute('cx', node.x + 15); dot.setAttribute('cy', node.y + MM_H / 2);
    dot.setAttribute('r', '4'); dot.setAttribute('fill', col);
    g.append(dot);

    const label = node.title.length > 9 ? node.title.slice(0, 8) + '…' : node.title;
    const txt = svgEl('text');
    txt.setAttribute('x', node.x + 27); txt.setAttribute('y', node.y + MM_H / 2);
    txt.setAttribute('dominant-baseline', 'middle');
    txt.setAttribute('fill', isActive ? '#f0f9ff' : '#d1d5db');
    txt.setAttribute('font-size', '13.5'); txt.setAttribute('font-weight', isActive ? '600' : '400');
    txt.setAttribute('font-family', "'Segoe UI',sans-serif");
    txt.textContent = label;
    g.append(txt);

    const title = svgEl('title'); title.textContent = node.title; g.append(title);

    g.addEventListener('mouseenter', () => { rect.setAttribute('stroke', col); rect.setAttribute('fill', col + '22'); });
    g.addEventListener('mouseleave', () => { rect.setAttribute('stroke', isActive ? col : col + '77'); rect.setAttribute('fill', isActive ? col + '33' : 'rgba(13,17,22,0.88)'); });

    g.addEventListener('click', e => {
      e.stopPropagation();
      if (mmDragging) return;
      activeNode = storyNodes[node.id];
      renderScene(activeNode);
      toggleTree(false);
    });
    vp.append(g);
  });
}

function mmUpdateTransform() {
  const vp = document.getElementById('mm-vp');
  if (vp) vp.setAttribute('transform', `translate(${mmPanX},${mmPanY}) scale(${mmScale})`);
}

function mmFitView() {
  const svg = document.getElementById('mindmap-svg');
  if (!svg) return;
  const { nodes } = buildMMLayout();
  if (!nodes.length) return;
  const minX = Math.min(...nodes.map(n => n.x));
  const maxX = Math.max(...nodes.map(n => n.x + MM_W));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxY = Math.max(...nodes.map(n => n.y + MM_H));
  const w = svg.clientWidth || 800, h = svg.clientHeight || 600;
  mmScale = Math.min((w - 80) / (maxX - minX), (h - 80) / (maxY - minY), 1.6);
  mmPanX = (w - (maxX - minX) * mmScale) / 2 - minX * mmScale;
  mmPanY = (h - (maxY - minY) * mmScale) / 2 - minY * mmScale;
  mmUpdateTransform();
}

function setupMMInteraction() {
  const svg = document.getElementById('mindmap-svg');
  if (!svg || svg._mmReady) return;
  svg._mmReady = true;
  let sx = 0, sy = 0, lx = 0, ly = 0;

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.12 : 0.89;
    const r = svg.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    mmPanX = cx - (cx - mmPanX) * f;
    mmPanY = cy - (cy - mmPanY) * f;
    mmScale = Math.min(3, Math.max(0.15, mmScale * f));
    mmUpdateTransform();
  }, { passive: false });

  svg.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    mmDragging = false; sx = lx = e.clientX; sy = ly = e.clientY;
    const move = ev => {
      if (Math.abs(ev.clientX - sx) > 4 || Math.abs(ev.clientY - sy) > 4) mmDragging = true;
      mmPanX += ev.clientX - lx; mmPanY += ev.clientY - ly;
      lx = ev.clientX; ly = ev.clientY;
      mmUpdateTransform();
    };
    const up = () => { setTimeout(() => { mmDragging = false; }, 30); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });

  svg.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { mmDragging = false; sx = lx = e.touches[0].clientX; sy = ly = e.touches[0].clientY; }
    else if (e.touches.length === 2) { mmLastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); mmDragging = true; }
    e.preventDefault();
  }, { passive: false });

  svg.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      if (Math.abs(e.touches[0].clientX - sx) > 6) mmDragging = true;
      mmPanX += e.touches[0].clientX - lx; mmPanY += e.touches[0].clientY - ly;
      lx = e.touches[0].clientX; ly = e.touches[0].clientY;
      mmUpdateTransform();
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (mmLastDist) { mmScale = Math.min(3, Math.max(0.15, mmScale * d / mmLastDist)); mmUpdateTransform(); }
      mmLastDist = d;
    }
  }, { passive: false });

  svg.addEventListener('touchend', () => { mmLastDist = 0; setTimeout(() => { mmDragging = false; }, 50); });
}

document.getElementById('mm-zoom-in') .addEventListener('click', () => { mmScale = Math.min(3,    mmScale * 1.2); mmUpdateTransform(); });
document.getElementById('mm-zoom-out').addEventListener('click', () => { mmScale = Math.max(0.15, mmScale / 1.2); mmUpdateTransform(); });
document.getElementById('mm-fit')     .addEventListener('click', mmFitView);

function populateTree() { renderMindMap(); }

function toggleTree(open) {
  treeDrawer.classList.toggle('open', open);
}

// ── Editor ──────────────────────────────────────────────────────────────────

let editingId = null;
let dragSrc = null;

function saveToStorage() {
  localStorage.setItem('trpg_nodes', JSON.stringify(storyNodes));
  pushToGist();
}

function exportDataJson() {
  const blob = new Blob([JSON.stringify(storyNodes, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'data.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function loadDataJson() {
  try {
    const res = await fetch('./data.json?t=' + Date.now());
    if (!res.ok) return false;
    const data = await res.json();
    if (typeof data !== 'object' || Array.isArray(data)) return false;
    storyNodes = data;
    localStorage.setItem('trpg_nodes', JSON.stringify(storyNodes));
    return true;
  } catch {
    return false;
  }
}

function stripTags(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.innerText;
}

function formatPaste(text) {
  return text.trim()
    .split(/\n{2,}/)
    .filter(p => p.trim())
    .map(para => {
      const trimmed = para.trim();
      // Detect heading: lines starting with # or ##
      const headingMatch = trimmed.match(/^#{1,3} (.+)/);
      if (headingMatch) {
        return `<p class="paste-heading">${escHtml(headingMatch[1])}</p>`;
      }
      let html = escHtml(trimmed);
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*([^*\n]+?)\*/g,  '<em>$1</em>');
      html = html.replace(/\n/g, '<br>');
      return `<p>${html}</p>`;
    })
    .join('');
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openEditorPanel() {
  editorOverlay.classList.add('open');
  editingId = null;
  editorFormPanel.innerHTML = '<p class="form-placeholder">← 點選左側節點來編輯</p>';
  renderOutline();
}

function closeEditorPanel() {
  editorOverlay.classList.remove('open');
  populateTree();
  renderScene(activeNode);
}

function buildTree() {
  const visited = new Set();
  const result = [];

  function traverse(nodeId, depth, parentId) {
    if (!storyNodes[nodeId] || visited.has(nodeId)) return;
    visited.add(nodeId);
    result.push({ nodeId, depth, parentId: parentId ?? null });
    storyNodes[nodeId].options.forEach(opt => { if (opt.next) traverse(opt.next, depth + 1, nodeId); });
  }

  const root = storyNodes.entrance ? 'entrance' : Object.keys(storyNodes)[0];
  if (root) traverse(root, 0, null);

  const orphans = Object.keys(storyNodes).filter(id => !visited.has(id));
  if (orphans.length) {
    result.push({ separator: true });
    orphans.forEach(id => result.push({ nodeId: id, depth: 0, orphan: true, parentId: null }));
  }
  return result;
}

function renderOutline() {
  outlineListEl.innerHTML = '';
  buildTree().forEach(entry => {
    if (entry.separator) {
      const sep = document.createElement('div');
      sep.className = 'outline-separator';
      sep.textContent = '— 未連結節點 —';
      outlineListEl.append(sep);
      return;
    }
    const { nodeId, depth, orphan, parentId } = entry;
    const node = storyNodes[nodeId];
    const item = document.createElement('div');
    item.className = ['outline-item', editingId === nodeId ? 'active' : '', orphan ? 'orphan' : ''].filter(Boolean).join(' ');
    item.style.paddingLeft = (14 + depth * 18) + 'px';
    item.draggable = !!parentId;
    item.innerHTML = `
      <div class="node-row">
        ${depth > 0 ? '<span class="branch-sym">└─</span>' : '<span class="root-dot">◆</span>'}
        <div class="node-info">
          <strong>${escHtml(node.title)}</strong>
          <small>${escHtml(node.description.slice(0, 44))}…</small>
        </div>
        ${orphan ? '<span class="orphan-tag">孤立</span>' : ''}
        ${parentId ? '<span class="drag-handle">⠿</span>' : ''}
      </div>
    `;

    if (parentId) {
      item.addEventListener('dragstart', e => {
        dragSrc = { nodeId, parentId };
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => item.classList.add('dragging'), 0);
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.outline-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        dragSrc = null;
      });
      item.addEventListener('dragover', e => {
        if (!dragSrc || dragSrc.parentId !== parentId || dragSrc.nodeId === nodeId) return;
        e.preventDefault();
        document.querySelectorAll('.outline-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (!dragSrc || dragSrc.parentId !== parentId || dragSrc.nodeId === nodeId) return;
        const parent = storyNodes[parentId];
        const srcIdx = parent.options.findIndex(o => o.next === dragSrc.nodeId);
        const dstIdx = parent.options.findIndex(o => o.next === nodeId);
        if (srcIdx === -1 || dstIdx === -1) return;
        const [moved] = parent.options.splice(srcIdx, 1);
        parent.options.splice(dstIdx, 0, moved);
        saveToStorage();
        renderOutline();
        if (activeNode.id === parentId) renderScene(activeNode);
      });
    }

    item.addEventListener('click', () => loadForm(nodeId));
    outlineListEl.append(item);
  });
}

function loadForm(nodeId) {
  editingId = nodeId;
  renderOutline();
  const node = storyNodes[nodeId];
  editorFormPanel.innerHTML = `
    <div class="form-group">
      <label>節點 ID（英文，唯一識別碼）</label>
      <input id="f-id" value="${escHtml(node.id)}" ${node.id === 'entrance' ? 'readonly title="起始節點不可修改 ID"' : ''} />
    </div>
    <div class="form-group">
      <label>標題</label>
      <input id="f-title" value="${escHtml(node.title)}" />
    </div>
    <div class="form-group">
      <label>場景描述</label>
      <textarea id="f-desc">${escHtml(stripTags(node.description))}</textarea>
    </div>
    <div class="form-group">
      <label>玩家選項</label>
      <div id="f-options"></div>
      <button id="f-add-opt" class="small-action" style="margin-top:8px">＋ 新增選項</button>
    </div>
    <div class="form-actions">
      <button id="f-save" class="action-btn primary">儲存</button>
      ${node.id !== 'entrance' ? '<button id="f-delete" class="action-btn danger">刪除節點</button>' : ''}
    </div>
  `;
  renderOptionRows([...node.options]);
  document.getElementById('f-add-opt').addEventListener('click', () => {
    renderOptionRows([...getOptionsFromForm(), { label: '', next: '' }]);
  });
  document.getElementById('f-save').addEventListener('click', () => saveNode(nodeId));
  document.getElementById('f-delete')?.addEventListener('click', () => deleteNode(nodeId));
}

function renderOptionRows(options) {
  const container = document.getElementById('f-options');
  if (!container) return;
  container.innerHTML = '';
  const nodeChoices = Object.values(storyNodes)
    .map(n => `<option value="${n.id}" ${n.id === '' ? '' : ''}>${escHtml(n.title)}</option>`)
    .join('');
  options.forEach((opt, i) => {
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `
      <input class="opt-label" placeholder="選項文字" value="${escHtml(opt.label)}" />
      <select class="opt-next">
        <option value="">— 選擇下一個節點 —</option>
        ${Object.values(storyNodes).map(n => `<option value="${n.id}" ${n.id === opt.next ? 'selected' : ''}>${escHtml(n.title)}</option>`).join('')}
      </select>
      <button class="opt-remove">✕</button>
    `;
    row.querySelector('.opt-remove').addEventListener('click', () => {
      const opts = getOptionsFromForm();
      opts.splice(i, 1);
      renderOptionRows(opts);
    });
    container.append(row);
  });
}

function getOptionsFromForm() {
  return Array.from(document.querySelectorAll('#f-options .option-row')).map(row => ({
    label: row.querySelector('.opt-label').value,
    next: row.querySelector('.opt-next').value
  }));
}

function saveNode(oldId) {
  const newId = document.getElementById('f-id').value.trim();
  const title = document.getElementById('f-title').value.trim();
  const desc = document.getElementById('f-desc').value.trim();
  const options = getOptionsFromForm().filter(o => o.label && o.next);
  if (!newId || !title || !desc) { alert('請填寫 ID、標題與描述'); return; }
  if (newId !== oldId) {
    if (storyNodes[newId]) { alert(`ID「${newId}」已存在，請使用其他名稱`); return; }
    delete storyNodes[oldId];
    Object.values(storyNodes).forEach(n => n.options.forEach(o => { if (o.next === oldId) o.next = newId; }));
    history = history.map(h => h === oldId ? newId : h);
    if (activeNode.id === oldId) activeNode = storyNodes[newId] ?? Object.values(storyNodes)[0];
  }
  storyNodes[newId] = { id: newId, title, description: desc, options };
  saveToStorage();
  editingId = newId;
  renderOutline();
  loadForm(newId);
}

function deleteNode(nodeId) {
  if (!confirm(`確定要刪除「${storyNodes[nodeId].title}」？\n其他節點中指向它的選項也會一併移除。`)) return;
  delete storyNodes[nodeId];
  Object.values(storyNodes).forEach(n => { n.options = n.options.filter(o => o.next !== nodeId); });
  if (activeNode.id === nodeId) activeNode = storyNodes.entrance ?? Object.values(storyNodes)[0];
  history = history.filter(h => h !== nodeId);
  saveToStorage();
  editingId = null;
  editorFormPanel.innerHTML = '<p class="form-placeholder">← 點選左側節點來編輯</p>';
  renderOutline();
}

function addNewNode() {
  const id = 'node_' + Date.now();
  storyNodes[id] = { id, title: '新節點', description: '在此輸入場景描述...', options: [] };
  saveToStorage();
  renderOutline();
  loadForm(id);
}

openEditorBtn.addEventListener('click', openEditorPanel);
closeEditorBtn.addEventListener('click', closeEditorPanel);
addNodeBtn.addEventListener('click', addNewNode);

// ── Quick-create panel ───────────────────────────────────────────────────────

const qcPanel      = document.getElementById('qc-panel');
const qcLabel      = document.getElementById('qc-label');
const qcFromTitle  = document.getElementById('qc-from-title');
const qcExistingSel = document.getElementById('qc-existing-sel');

function openQCPanel(fromNode) {
  qcFromTitle.textContent = fromNode.title;
  qcLabel.value = '';
  qcExistingSel.innerHTML = Object.values(storyNodes)
    .filter(n => n.id !== fromNode.id)
    .map(n => `<option value="${n.id}">${escHtml(n.title)}</option>`)
    .join('');
  qcPanel.classList.add('open');
  qcPanel._fromNode = fromNode;
  setTimeout(() => qcLabel.focus(), 60);
}

function closeQCPanel() {
  qcPanel.classList.remove('open');
}

document.getElementById('qc-create-btn').addEventListener('click', () => {
  const label = qcLabel.value.trim();
  if (!label) { qcLabel.focus(); return; }
  const fromNode = qcPanel._fromNode;

  const newId = 'node_' + Date.now();
  storyNodes[newId] = { id: newId, title: label, description: '', options: [] };
  fromNode.options.push({ label, next: newId });
  saveToStorage();
  closeQCPanel();

  history.push(fromNode.id);
  activeNode = storyNodes[newId];
  renderScene(activeNode);
  populateTree();

  // Auto-focus description so user can start typing immediately
  setTimeout(() => {
    sceneDescription.focus();
    const range = document.createRange();
    range.selectNodeContents(sceneDescription);
    range.collapse(false);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }, 80);
});

document.getElementById('qc-link-btn').addEventListener('click', () => {
  const label = qcLabel.value.trim();
  const nextId = qcExistingSel.value;
  if (!label || !nextId) return;
  qcPanel._fromNode.options.push({ label, next: nextId });
  saveToStorage();
  renderScene(qcPanel._fromNode);
  closeQCPanel();
});

document.getElementById('qc-cancel-btn').addEventListener('click', closeQCPanel);

qcLabel.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('qc-create-btn').click();
  if (e.key === 'Escape') closeQCPanel();
});

// ── GitHub Gist sync ─────────────────────────────────────────────────────────

let ghToken = localStorage.getItem('gh_token') ?? '';
let ghGistId = localStorage.getItem('gh_gist_id') ?? '';

const GIST_FILE = 'trpg_story.json';
const GH_API = 'https://api.github.com';

function ghHeaders() {
  return { Authorization: `Bearer ${ghToken}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' };
}

function setSyncStatus(state) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  const map = { idle: ['未設定', ''], ok: ['已同步 ✓', 'ss-ok'], syncing: ['同步中...', 'ss-busy'], error: ['同步失敗', 'ss-error'], linked: ['已連結', 'ss-ok'] };
  const [text, cls] = map[state] ?? map.idle;
  el.textContent = text;
  el.className = 'sync-status-badge ' + cls;
}

async function pushToGist() {
  if (!ghToken) return;
  const payload = { files: { [GIST_FILE]: { content: JSON.stringify(storyNodes) } } };
  try {
    setSyncStatus('syncing');
    if (ghGistId) {
      await fetch(`${GH_API}/gists/${ghGistId}`, { method: 'PATCH', headers: ghHeaders(), body: JSON.stringify(payload) });
    } else {
      const res = await fetch(`${GH_API}/gists`, { method: 'POST', headers: ghHeaders(), body: JSON.stringify({ ...payload, description: 'TRPG GM Story', public: false }) });
      const data = await res.json();
      if (!data.id) throw new Error();
      ghGistId = data.id;
      localStorage.setItem('gh_gist_id', ghGistId);
    }
    setSyncStatus('ok');
  } catch {
    setSyncStatus('error');
  }
}

async function loadFromGist() {
  if (!ghToken || !ghGistId) return;
  try {
    setSyncStatus('syncing');
    const res = await fetch(`${GH_API}/gists/${ghGistId}`, { headers: ghHeaders() });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const content = data.files[GIST_FILE]?.content;
    if (!content) throw new Error();
    storyNodes = JSON.parse(content);
    localStorage.setItem('trpg_nodes', JSON.stringify(storyNodes));
    history = [];
    activeNode = storyNodes.entrance ?? Object.values(storyNodes)[0];
    populateTree();
    renderScene(activeNode);
    setSyncStatus('ok');
  } catch {
    setSyncStatus('error');
  }
}

function updateGistUI() {
  const tokenInput = document.getElementById('gh-token-input');
  if (tokenInput && ghToken) tokenInput.value = ghToken;
  setSyncStatus(ghToken && ghGistId ? 'linked' : 'idle');
  const fetchBtn = document.getElementById('fetch-gist-btn');
  const disconnectBtn = document.getElementById('disconnect-gist-btn');
  if (fetchBtn) fetchBtn.style.display = ghToken && ghGistId ? '' : 'none';
  if (disconnectBtn) disconnectBtn.style.display = ghToken ? '' : 'none';
}

// ── Sync modal ───────────────────────────────────────────────────────────────

const syncOverlay  = document.getElementById('sync-overlay');
const syncOut      = document.getElementById('sync-out');
const syncIn       = document.getElementById('sync-in');

function applyImport(parsed) {
  if (!confirm('匯入後將取代目前所有劇情節點，確定嗎？')) return false;
  storyNodes = parsed;
  saveToStorage();
  history = [];
  activeNode = storyNodes.entrance ?? Object.values(storyNodes)[0];
  populateTree();
  renderScene(activeNode);
  return true;
}

document.getElementById('export-data-json-btn').addEventListener('click', exportDataJson);

document.getElementById('sync-btn').addEventListener('click', () => {
  syncOut.value = JSON.stringify(storyNodes);
  syncIn.value  = '';
  syncOverlay.classList.add('open');
  updateGistUI();
});

document.getElementById('close-sync').addEventListener('click', () => {
  syncOverlay.classList.remove('open');
});

document.getElementById('copy-sync-btn').addEventListener('click', () => {
  syncOut.select();
  navigator.clipboard.writeText(syncOut.value).then(() => {
    const btn = document.getElementById('copy-sync-btn');
    btn.textContent = '已複製 ✓';
    setTimeout(() => { btn.textContent = '複製同步碼'; }, 2000);
  });
});

document.getElementById('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(storyNodes, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `劇情_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// GitHub Gist UI events
document.getElementById('gh-token-toggle').addEventListener('click', () => {
  const inp = document.getElementById('gh-token-input');
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  document.getElementById('gh-token-toggle').textContent = isHidden ? '隱藏' : '顯示';
});

document.getElementById('connect-gist-btn').addEventListener('click', async () => {
  const token = document.getElementById('gh-token-input').value.trim();
  if (!token) { alert('請先貼上 GitHub Token'); return; }
  const btn = document.getElementById('connect-gist-btn');
  btn.textContent = '連結中...';
  btn.disabled = true;
  try {
    const res = await fetch(`${GH_API}/user`, { headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!res.ok) throw new Error();
    ghToken = token;
    localStorage.setItem('gh_token', ghToken);
    await pushToGist();
    updateGistUI();
    alert('連結成功！之後每次儲存都會自動同步到 GitHub。');
  } catch {
    alert('連結失敗，請確認 Token 正確且已勾選 gist 權限');
  }
  btn.textContent = '連結 GitHub';
  btn.disabled = false;
});

document.getElementById('fetch-gist-btn').addEventListener('click', async () => {
  if (!confirm('從 GitHub 載入最新版本？目前本機的劇情將被覆蓋。')) return;
  await loadFromGist();
});

document.getElementById('disconnect-gist-btn').addEventListener('click', () => {
  if (!confirm('取消連結後將停止自動同步，確定嗎？')) return;
  ghToken = ''; ghGistId = '';
  localStorage.removeItem('gh_token');
  localStorage.removeItem('gh_gist_id');
  document.getElementById('gh-token-input').value = '';
  updateGistUI();
});

document.getElementById('paste-import-btn').addEventListener('click', () => {
  try {
    const parsed = JSON.parse(syncIn.value.trim());
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    if (applyImport(parsed)) syncOverlay.classList.remove('open');
  } catch {
    alert('格式錯誤，請確認貼上的是正確的同步碼');
  }
});

document.getElementById('import-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      if (applyImport(parsed)) syncOverlay.classList.remove('open');
    } catch {
      alert('檔案格式錯誤，請選擇正確的劇情 JSON 檔案');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ────────────────────────────────────────────────────────────────────────────

openTree.addEventListener('click', () => {
  toggleTree(true);
  setupMMInteraction();
  setTimeout(() => { renderMindMap(); mmFitView(); }, 60);
});
closeTree.addEventListener('click', () => toggleTree(false));
goBack.addEventListener('click', () => {
  if (history.length === 0) return;
  activeNode = storyNodes[history.pop()];
  renderScene(activeNode);
});

resetProgress.addEventListener('click', () => {
  history = [];
  activeNode = storyNodes.entrance;
  renderScene(activeNode);
});

const gmNotes = document.getElementById('gm-notes');
const savedNotes = localStorage.getItem('trpg_notes');
if (savedNotes) gmNotes.innerHTML = savedNotes;

function saveNotes() {
  localStorage.setItem('trpg_notes', gmNotes.innerHTML);
}

gmNotes.addEventListener('input', saveNotes);
gmNotes.addEventListener('paste', e => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  if (!text.trim()) return;
  document.execCommand('insertHTML', false, formatPaste(text));
  saveNotes();
});

document.querySelectorAll('.hl-btn').forEach(btn => {
  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    const color = btn.dataset.color;
    document.execCommand('hiliteColor', false, color ?? 'transparent');
    saveNotes();
  });
});

// Floating highlight toolbar for scene title / description
const floatHL = document.createElement('div');
floatHL.id = 'float-hl';
floatHL.innerHTML = `
  <button data-color="rgba(255,200,0,0.45)" title="黃色"></button>
  <button data-color="rgba(50,220,100,0.4)"  title="綠色"></button>
  <button data-color="rgba(255,80,80,0.45)"  title="紅色"></button>
  <button data-color="rgba(80,160,255,0.45)" title="藍色"></button>
  <button data-color="clear" title="清除">✕</button>
`;
document.body.append(floatHL);

floatHL.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('mousedown', e => {
    e.preventDefault();
    const color = btn.dataset.color;
    document.execCommand('hiliteColor', false, color === 'clear' ? 'transparent' : color);
    if (storyNodes[activeNode.id] && sceneDescription.contains(window.getSelection()?.anchorNode)) {
      storyNodes[activeNode.id].description = sceneDescription.innerHTML;
      saveToStorage();
    }
    floatHL.style.display = 'none';
  });
});

function positionFloatHL() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) { floatHL.style.display = 'none'; return; }
  const anchor = sel.anchorNode;
  if (!sceneTitle.contains(anchor) && !sceneDescription.contains(anchor)) {
    floatHL.style.display = 'none'; return;
  }
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  const tw = 152, th = 44;
  floatHL.style.display = 'flex';
  floatHL.style.top  = Math.max(8, rect.top - th - 8) + 'px';
  floatHL.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, rect.left + rect.width / 2 - tw / 2)) + 'px';
}

document.addEventListener('mouseup', () => setTimeout(positionFloatHL, 10));
document.addEventListener('keyup', positionFloatHL);
document.addEventListener('mousedown', e => { if (!floatHL.contains(e.target)) floatHL.style.display = 'none'; });

// Inline editing for title and description
sceneTitle.contentEditable = 'true';
sceneTitle.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); sceneTitle.blur(); }
});
sceneTitle.addEventListener('blur', () => {
  const text = sceneTitle.textContent.trim();
  if (text && storyNodes[activeNode.id]) {
    storyNodes[activeNode.id].title = text;
    saveToStorage();
    populateTree();
  }
});

sceneDescription.contentEditable = 'true';
sceneDescription.addEventListener('paste', e => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  if (!text.trim()) return;
  document.execCommand('insertHTML', false, formatPaste(text));
  if (storyNodes[activeNode.id]) {
    storyNodes[activeNode.id].description = sceneDescription.innerHTML;
    saveToStorage();
  }
});

sceneDescription.addEventListener('blur', () => {
  if (storyNodes[activeNode.id] && sceneDescription.innerHTML.trim()) {
    storyNodes[activeNode.id].description = sceneDescription.innerHTML;
    saveToStorage();
  }
});

populateTree();
renderScene(activeNode);

// Auto-load: Gist takes priority, then data.json, then localStorage
if (ghToken && ghGistId) {
  loadFromGist();
} else {
  loadDataJson().then(loaded => {
    if (loaded) {
      history = [];
      activeNode = storyNodes.entrance ?? Object.values(storyNodes)[0];
      populateTree();
      renderScene(activeNode);
    }
  });
}
