// ===== STATE =====
let state = {
  currentPage: 'dashboard',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  transactionType: 'expense',
  goalType: 'monthly',
  selectedColor: '#c8f135',
  selectedEmoji: '🛒',
  selectedGoalEmoji: '🎯',
  reportPeriod: '1m',
  txFilter: 'all',
  editingTxId: null,
  editingCatId: null,
  editingCardId: null,
  viewingCardId: null,
};

// ===== DATA =====
function loadData() {
  return {
    transactions: JSON.parse(localStorage.getItem('mb_transactions') || '[]'),
    cards: JSON.parse(localStorage.getItem('mb_cards') || JSON.stringify(defaultCards())),
    categories: JSON.parse(localStorage.getItem('mb_categories') || JSON.stringify(defaultCategories())),
    budgets: JSON.parse(localStorage.getItem('mb_budgets') || '{}'),
    goals: JSON.parse(localStorage.getItem('mb_goals') || '[]'),
    recurrents: JSON.parse(localStorage.getItem('mb_recurrents') || '[]'),
  };
}

function saveData(key, value) {
  localStorage.setItem('mb_' + key, JSON.stringify(value));
}

function defaultCards() {
  return [
    { id: 'c1', nome: 'Conta corrente', tipo: 'conta', limite: 0, cor: '#60a5fa', fechamento: 0, vencimento: 0 },
    { id: 'c2', nome: 'Cartão de crédito', tipo: 'credito', limite: 5000, cor: '#c8f135', fechamento: 10, vencimento: 5 },
    { id: 'c3', nome: 'Pix / Dinheiro', tipo: 'pix', limite: 0, cor: '#4ade80', fechamento: 0, vencimento: 0 },
  ];
}

function defaultCategories() {
  return [
    { id: 'cat1', nome: 'Alimentação', icon: '🛒', tipo: 'expense', recorrente: false },
    { id: 'cat2', nome: 'Transporte', icon: '🚗', tipo: 'expense', recorrente: false },
    { id: 'cat3', nome: 'Moradia', icon: '🏠', tipo: 'expense', recorrente: true },
    { id: 'cat4', nome: 'Saúde', icon: '💊', tipo: 'expense', recorrente: false },
    { id: 'cat5', nome: 'Lazer', icon: '🎮', tipo: 'expense', recorrente: false },
    { id: 'cat6', nome: 'Educação', icon: '📚', tipo: 'expense', recorrente: false },
    { id: 'cat7', nome: 'Vestuário', icon: '👕', tipo: 'expense', recorrente: false },
    { id: 'cat8', nome: 'Streaming', icon: '📺', tipo: 'expense', recorrente: true },
    { id: 'cat9', nome: 'Salário', icon: '💰', tipo: 'income', recorrente: true },
    { id: 'cat10', nome: 'Freelance', icon: '💻', tipo: 'income', recorrente: false },
    { id: 'cat11', nome: 'Investimentos', icon: '📈', tipo: 'both', recorrente: false },
    { id: 'cat12', nome: 'Outros', icon: '📦', tipo: 'both', recorrente: false },
  ];
}

// ===== MONTH UTILS =====
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function changeMonth(d) {
  state.currentMonth += d;
  if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
  if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
  applyRecurrents();
  renderPage();
  updateHeader();
}

function updateHeader() {
  document.getElementById('header-month').textContent = MONTHS[state.currentMonth] + ' ' + state.currentYear;
  const titles = { dashboard: 'Início', transactions: 'Transações', reports: 'Relatórios', goals: 'Metas', card_detail: 'Detalhes do Cartão' };
  document.getElementById('header-title').textContent = titles[state.currentPage] || 'Meu Bolso';
}

// ===== CARD BILLING MONTH =====
// Returns {month, year} of which billing cycle a transaction date belongs to for a given card
function getBillingMonth(dateStr, card) {
  if (!card || card.tipo !== 'credito' || !card.fechamento) {
    const d = new Date(dateStr + 'T12:00:00');
    return { month: d.getMonth(), year: d.getFullYear() };
  }
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate();
  let month = d.getMonth();
  let year = d.getFullYear();
  if (day > card.fechamento) {
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return { month, year };
}

// ===== RECURRENTS =====
function applyRecurrents() {
  const data = loadData();
  const key = `${state.currentYear}-${state.currentMonth}`;
  const applied = JSON.parse(localStorage.getItem('mb_applied_recurrents') || '{}');
  if (applied[key]) return;
  let changed = false;
  data.recurrents.forEach(r => {
    const exists = data.transactions.some(t => t.recurrentId === r.id && t.month === state.currentMonth && t.year === state.currentYear);
    if (!exists) {
      data.transactions.push({
        id: 'tx_' + Date.now() + '_' + Math.random(),
        desc: r.desc, valor: r.valor, cat: r.cat, conta: r.conta,
        tipo: r.tipo, data: `${state.currentYear}-${String(state.currentMonth+1).padStart(2,'0')}-01`,
        month: state.currentMonth, year: state.currentYear,
        recurrentId: r.id, isRecurrent: true,
        parcelas: 1, parcelaAtual: 1,
      });
      changed = true;
    }
  });
  if (changed) saveData('transactions', data.transactions);
  applied[key] = true;
  localStorage.setItem('mb_applied_recurrents', JSON.stringify(applied));
}

// ===== NAVIGATION =====
function navigate(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  updateHeader();
  renderPage();
}

function renderPage() {
  const main = document.getElementById('main-content');
  applyRecurrents();
  switch (state.currentPage) {
    case 'dashboard': main.innerHTML = renderDashboard(); break;
    case 'transactions': main.innerHTML = renderTransactions(); break;
    case 'reports': main.innerHTML = renderReports(); break;
    case 'goals': main.innerHTML = renderGoals(); break;
    case 'card_detail': main.innerHTML = renderCardDetail(); break;
  }
}

// ===== FORMAT =====
function fmt(v) { return 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtSign(v) { return (v >= 0 ? '+' : '-') + ' R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ===== CURRENCY INPUT =====
function setupCurrencyInput(el) {
  el.setAttribute('inputmode', 'numeric');
  el.setAttribute('placeholder', 'R$ 0,00');
  el.type = 'text';
  el.addEventListener('input', function(e) {
    let raw = this.value.replace(/\D/g, '');
    if (!raw) { this.value = ''; return; }
    let cents = parseInt(raw, 10);
    let reais = cents / 100;
    this.value = reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.dataset.cents = cents;
  });
}

function getCurrencyValue(el) {
  if (el.dataset.cents) return parseInt(el.dataset.cents) / 100;
  let raw = el.value.replace(/\D/g, '');
  if (!raw) return 0;
  return parseInt(raw) / 100;
}

function setCurrencyValue(el, value) {
  let cents = Math.round(value * 100);
  el.dataset.cents = cents;
  el.value = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== MONTH TRANSACTIONS =====
function getMonthTx(month, year) {
  const data = loadData();
  return data.transactions.filter(t => t.month === month && t.year === year);
}

function getTxTotals(txs) {
  const income = txs.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
  const expense = txs.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);
  return { income, expense, balance: income - expense };
}

// ===== DASHBOARD =====
function renderDashboard() {
  const data = loadData();
  const txs = getMonthTx(state.currentMonth, state.currentYear);
  const { income, expense, balance } = getTxTotals(txs);

  // Budget alerts
  const catExpenses = {};
  txs.filter(t => t.tipo === 'expense').forEach(t => {
    catExpenses[t.cat] = (catExpenses[t.cat] || 0) + t.valor;
  });
  let alerts = '';
  Object.entries(data.budgets).forEach(([catId, limit]) => {
    if (!limit) return;
    const spent = catExpenses[catId] || 0;
    const pct = spent / limit * 100;
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return;
    if (pct >= 100) alerts += `<div class="budget-alert danger">${cat.icon} ${cat.nome}: orçamento estourado!</div>`;
    else if (pct >= 80) alerts += `<div class="budget-alert warning">${cat.icon} ${cat.nome}: 80% do orçamento usado</div>`;
  });

  const recent = [...txs].sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 5);

  return `
    <div class="balance-card">
      <div class="balance-label">Saldo do mês</div>
      <div class="balance-value ${balance >= 0 ? 'positive' : 'negative'}">${fmtSign(balance)}</div>
    </div>
    <div class="mini-cards">
      <div class="mini-card"><div class="mini-card-label">Receitas</div><div class="mini-card-value income">${fmt(income)}</div></div>
      <div class="mini-card"><div class="mini-card-label">Gastos</div><div class="mini-card-value expense">${fmt(expense)}</div></div>
    </div>
    ${alerts ? `<div class="chart-container" style="margin-bottom:12px">${alerts}</div>` : ''}
    <div class="section-header">
      <span class="section-title">Contas & Cartões</span>
      <button class="section-action" onclick="showModal('modal-cards')">Gerenciar</button>
    </div>
    <div class="account-scroll">
      ${data.cards.map(c => renderAccountCard(c, txs)).join('')}
    </div>
    <div class="section-header" style="margin-top:20px">
      <span class="section-title">Orçamento</span>
      <button class="section-action" onclick="showModal('modal-budget')">Editar</button>
    </div>
    ${renderBudgetBars(txs, data)}
    <div class="section-header">
      <span class="section-title">Últimas transações</span>
      <button class="section-action" onclick="navigate('transactions')">Ver todas</button>
    </div>
    ${recent.length ? recent.map(t => renderTxItem(t, data)).join('') : '<div class="empty-state"><div class="empty-state-icon">💸</div>Nenhuma transação este mês</div>'}
  `;
}

function renderAccountCard(c, txs) {
  const data = loadData();
  const allTx = data.transactions;
  // balance = all time income - expense for this account
  let bal = 0;
  allTx.forEach(t => {
    if (t.conta !== c.id) return;
    if (t.tipo === 'income') bal += t.valor;
    else bal -= t.valor;
  });
  const usedInMonth = (txs || []).filter(t => t.conta === c.id && t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);
  const limitDisp = c.limite > 0 ? c.limite - usedInMonth : null;
  const pct = c.limite > 0 ? Math.min(usedInMonth / c.limite * 100, 100) : 0;
  const vencInfo = c.vencimento ? `<div class="account-card-limit">Vence dia ${c.vencimento}</div>` : '';
  return `<div class="account-card" style="background:${c.cor}22;border:1px solid ${c.cor}44" onclick="viewCard('${c.id}')">
    <div class="account-card-type">${c.tipo}</div>
    <div class="account-card-name">${c.nome}</div>
    <div class="account-card-balance" style="color:${c.cor}">${fmt(usedInMonth > 0 ? usedInMonth : Math.abs(bal))}</div>
    ${c.limite > 0 ? `<div class="account-card-limit">Disponível: ${fmt(limitDisp)}</div>
    <div class="account-card-bar"><div class="account-card-bar-fill" style="width:${pct}%"></div></div>` : ''}
    ${vencInfo}
    <div class="account-card-limit" style="margin-top:4px;color:${c.cor}99">Toque para detalhes →</div>
  </div>`;
}

function renderBudgetBars(txs, data) {
  const catExpenses = {};
  txs.filter(t => t.tipo === 'expense').forEach(t => {
    catExpenses[t.cat] = (catExpenses[t.cat] || 0) + t.valor;
  });
  const budgetEntries = Object.entries(data.budgets).filter(([, v]) => v > 0);
  if (!budgetEntries.length) return '<div style="font-size:13px;color:var(--text3);margin-bottom:12px">Nenhum orçamento definido. <button class="section-action" onclick="showModal(\'modal-budget\')">Definir agora</button></div>';
  return budgetEntries.map(([catId, limit]) => {
    const cat = data.categories.find(c => c.id === catId);
    if (!cat) return '';
    const spent = catExpenses[catId] || 0;
    const pct = Math.min(spent / limit * 100, 100);
    const color = pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--accent)';
    return `<div class="budget-item">
      <div class="budget-item-header">
        <span class="budget-item-name">${cat.icon} ${cat.nome}</span>
        <span class="budget-item-values">${fmt(spent)} / ${fmt(limit)}</span>
      </div>
      <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="budget-pct">${Math.round(pct)}%</div>
      ${pct >= 100 ? '<div class="budget-alert danger">⚠ Orçamento estourado!</div>' : pct >= 80 ? '<div class="budget-alert warning">⚠ Atenção: 80% usado</div>' : ''}
    </div>`;
  }).join('');
}

// ===== CARD DETAIL =====
function viewCard(cardId) {
  state.viewingCardId = cardId;
  state.currentPage = 'card_detail';
  updateHeader();
  renderPage();
}

function renderCardDetail() {
  const data = loadData();
  const card = data.cards.find(c => c.id === state.viewingCardId);
  if (!card) return '<div class="empty-state">Cartão não encontrado</div>';

  // All transactions for this card
  const cardTxs = data.transactions.filter(t => t.conta === card.id && t.tipo === 'expense');

  // Group by billing month
  const billingGroups = {};
  cardTxs.forEach(t => {
    const bm = getBillingMonth(t.data, card);
    const key = `${bm.year}-${bm.month}`;
    if (!billingGroups[key]) billingGroups[key] = { month: bm.month, year: bm.year, txs: [], total: 0 };
    billingGroups[key].txs.push(t);
    billingGroups[key].total += t.valor;
  });

  // Sort: future first, then past
  const now = new Date();
  const sorted = Object.values(billingGroups).sort((a, b) => {
    const da = new Date(a.year, a.month, 1);
    const db = new Date(b.year, b.month, 1);
    return db - da;
  });

  // Current month usage
  const curKey = `${state.currentYear}-${state.currentMonth}`;
  const curGroup = billingGroups[curKey];
  const curUsed = curGroup ? curGroup.total : 0;
  const limitDisp = card.limite > 0 ? card.limite - curUsed : null;
  const pct = card.limite > 0 ? Math.min(curUsed / card.limite * 100, 100) : 0;
  const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : card.cor;

  // Next billing months (future parcelas)
  const futureFaturas = sorted.filter(g => {
    const d = new Date(g.year, g.month, 1);
    const cur = new Date(state.currentYear, state.currentMonth, 1);
    return d >= cur;
  });
  const pastFaturas = sorted.filter(g => {
    const d = new Date(g.year, g.month, 1);
    const cur = new Date(state.currentYear, state.currentMonth, 1);
    return d < cur;
  });

  return `
    <button onclick="navigate('dashboard')" style="background:none;border:none;color:var(--accent);font-family:var(--font);font-size:14px;cursor:pointer;margin-bottom:16px;padding:0">← Voltar</button>

    <div class="balance-card" style="border-color:${card.cor}44;background:${card.cor}11">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div class="balance-label">${card.nome}</div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px">${card.tipo}</div>
        </div>
        <div style="text-align:right">
          ${card.fechamento ? `<div style="font-size:11px;color:var(--text2)">Fecha dia ${card.fechamento}</div>` : ''}
          ${card.vencimento ? `<div style="font-size:11px;color:var(--amber)">Vence dia ${card.vencimento}</div>` : ''}
        </div>
      </div>
      <div class="balance-label">Fatura atual</div>
      <div class="balance-value" style="color:${color}">${fmt(curUsed)}</div>
      ${card.limite > 0 ? `
        <div style="margin-top:12px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:4px">
            <span>Limite usado</span><span>${fmt(curUsed)} / ${fmt(card.limite)}</span>
          </div>
          <div class="budget-bar"><div class="budget-bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <div style="font-size:12px;color:var(--text2);margin-top:4px">Disponível: <span style="color:var(--green);font-family:var(--mono)">${fmt(limitDisp)}</span></div>
        </div>
      ` : ''}
    </div>

    ${futureFaturas.length ? `
      <div class="section-header"><span class="section-title">Faturas futuras</span></div>
      ${futureFaturas.map(g => renderFaturaGroup(g, card, data, false)).join('')}
    ` : ''}

    ${pastFaturas.length ? `
      <div class="section-header" style="margin-top:16px"><span class="section-title">Faturas anteriores</span></div>
      ${pastFaturas.map(g => renderFaturaGroup(g, card, data, true)).join('')}
    ` : ''}

    ${!sorted.length ? '<div class="empty-state"><div class="empty-state-icon">💳</div>Nenhum gasto neste cartão</div>' : ''}
  `;
}

function renderFaturaGroup(g, card, data, collapsed) {
  const vencDia = card.vencimento ? ` · Vence dia ${card.vencimento}` : '';
  const id = `fatura_${g.year}_${g.month}`;
  return `<div class="chart-container" style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleFatura('${id}')">
      <div>
        <div style="font-size:14px;font-weight:500">${MONTHS[g.month]} ${g.year}${vencDia}</div>
        <div style="font-size:12px;color:var(--text2);font-family:var(--mono)">${fmt(g.total)}</div>
      </div>
      <span style="color:var(--text3);font-size:18px" id="arr_${id}">›</span>
    </div>
    <div id="${id}" style="display:${collapsed ? 'none' : 'block'};margin-top:10px;border-top:1px solid var(--line);padding-top:10px">
      ${g.txs.map(t => {
        const cat = data.categories.find(c => c.id === t.cat);
        const parcelaTag = t.parcelas > 1 ? `<span class="tx-parcela-badge">${t.parcelaAtual}/${t.parcelas}x</span>` : '';
        return `<div class="tx-item" style="margin-bottom:6px" onclick="editTransaction('${t.id}')">
          <div class="tx-icon" style="background:${cat ? '#ff5c5c22' : 'var(--bg3)'}">${cat ? cat.icon : '📦'}</div>
          <div class="tx-info">
            <div class="tx-desc">${t.desc} ${parcelaTag}</div>
            <div class="tx-meta">${cat ? cat.nome : '—'} · ${new Date(t.data+'T12:00:00').toLocaleDateString('pt-BR')}</div>
          </div>
          <div class="tx-amount expense">-${fmt(t.valor)}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function toggleFatura(id) {
  const el = document.getElementById(id);
  const arr = document.getElementById('arr_' + id);
  if (el.style.display === 'none') { el.style.display = 'block'; arr.textContent = '⌄'; }
  else { el.style.display = 'none'; arr.textContent = '›'; }
}

// ===== TRANSACTIONS PAGE =====
function renderTransactions() {
  const data = loadData();
  let txs = getMonthTx(state.currentMonth, state.currentYear);
  if (state.txFilter === 'income') txs = txs.filter(t => t.tipo === 'income');
  else if (state.txFilter === 'expense') txs = txs.filter(t => t.tipo === 'expense');
  txs.sort((a, b) => new Date(b.data) - new Date(a.data));

  const groups = {};
  txs.forEach(t => {
    const d = t.data || 'sem data';
    if (!groups[d]) groups[d] = [];
    groups[d].push(t);
  });

  return `
    <div class="filter-bar">
      <button class="filter-chip ${state.txFilter === 'all' ? 'active' : ''}" onclick="setTxFilter('all')">Todos</button>
      <button class="filter-chip ${state.txFilter === 'income' ? 'active' : ''}" onclick="setTxFilter('income')">Receitas</button>
      <button class="filter-chip ${state.txFilter === 'expense' ? 'active' : ''}" onclick="setTxFilter('expense')">Gastos</button>
    </div>
    ${Object.entries(groups).length ? Object.entries(groups).map(([date, items]) =>
      `<div class="tx-group-label">${formatDateLabel(date)}</div>` + items.map(t => renderTxItem(t, data)).join('')
    ).join('') : '<div class="empty-state"><div class="empty-state-icon">📭</div>Nenhuma transação encontrada</div>'}
  `;
}

function setTxFilter(f) { state.txFilter = f; renderPage(); }

function formatDateLabel(dateStr) {
  if (dateStr === 'sem data') return 'Sem data';
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function renderTxItem(t, data) {
  const cat = data.categories.find(c => c.id === t.cat);
  const card = data.cards.find(c => c.id === t.conta);
  const icon = cat ? cat.icon : '📦';
  const cardName = card ? card.nome : '—';
  const parcelaTag = t.parcelas > 1 ? `<span class="tx-parcela-badge">${t.parcelaAtual}/${t.parcelas}x</span>` : '';
  const recTag = t.isRecurrent ? `<span class="recorrente-badge">🔁</span>` : '';
  return `<div class="tx-item" onclick="editTransaction('${t.id}')">
    <div class="tx-icon" style="background:${cat ? getCatColor(cat) + '22' : 'var(--bg3)'}">${icon}</div>
    <div class="tx-info">
      <div class="tx-desc">${t.desc} ${parcelaTag} ${recTag}</div>
      <div class="tx-meta">${cat ? cat.nome : '—'} · ${cardName}</div>
    </div>
    <div class="tx-amount ${t.tipo}">${t.tipo === 'income' ? '+' : '-'}${fmt(t.valor)}</div>
  </div>`;
}

function getCatColor(cat) {
  const colors = { expense: '#ff5c5c', income: '#4ade80', both: '#60a5fa' };
  return colors[cat.tipo] || '#888';
}

// ===== ADD TRANSACTION =====
function showModal(id) {
  if (id === 'modal-add-transaction') {
    state.editingTxId = null;
    document.getElementById('modal-add-title').textContent = 'Nova Transação';
    const delBtn = document.querySelector('#modal-add-transaction .btn-delete');
    if (delBtn) delBtn.remove();
    const valorEl = document.getElementById('t-valor');
    valorEl.value = '';
    valorEl.dataset.cents = '';
    document.getElementById('t-desc').value = '';
    document.getElementById('t-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('t-parcelas').value = '1';
    document.getElementById('t-recorrente').checked = false;
    document.getElementById('parcela-info').textContent = '';
    setTransactionType('expense');
    populateCategorySelect();
    populateCardSelect();
  }
  if (id === 'modal-cards') renderCardsList();
  if (id === 'modal-categories') { renderCategoriesList(); renderEmojiPicker('emoji-picker', 'selectedEmoji'); renderColorDots(); }
  if (id === 'modal-budget') renderBudgetModal();
  if (id === 'modal-add-goal') { setGoalType('monthly'); renderGoalEmojiPicker(); }
  document.getElementById(id).classList.add('open');
}

function hideModal(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'modal-categories') { state.editingCatId = null; }
  if (id === 'modal-cards') { state.editingCardId = null; resetCardForm(); }
}

function setTransactionType(type) {
  state.transactionType = type;
  document.getElementById('type-expense').classList.toggle('active', type === 'expense');
  document.getElementById('type-income').classList.toggle('active', type === 'income');
  document.getElementById('parcelas-group').style.display = type === 'expense' ? 'block' : 'none';
  populateCategorySelect();
}

function populateCategorySelect() {
  const data = loadData();
  const sel = document.getElementById('t-cat');
  if (!sel) return;
  const filtered = data.categories.filter(c => c.tipo === state.transactionType || c.tipo === 'both');
  sel.innerHTML = filtered.map(c => `<option value="${c.id}">${c.icon} ${c.nome}</option>`).join('');
  sel.innerHTML += `<option value="__new__">＋ Nova categoria</option>`;
  sel.onchange = () => {
    if (sel.value === '__new__') {
      sel.value = filtered[0]?.id || '';
      showModal('modal-categories');
      return;
    }
    const cat = data.categories.find(c => c.id === sel.value);
    if (cat && cat.recorrente) document.getElementById('t-recorrente').checked = true;
  };
}

function populateCardSelect() {
  const data = loadData();
  const sel = document.getElementById('t-conta');
  if (!sel) return;
  sel.innerHTML = data.cards.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  sel.onchange = () => {
    const card = data.cards.find(c => c.id === sel.value);
    document.getElementById('parcelas-group').style.display = (card && card.tipo === 'credito' && state.transactionType === 'expense') ? 'block' : 'none';
    updateParcelaInfo();
  };
}

function updateParcelaInfo() {
  const n = parseInt(document.getElementById('t-parcelas').value) || 1;
  const val = getCurrencyValue(document.getElementById('t-valor'));
  if (n > 1 && val > 0) {
    document.getElementById('parcela-info').textContent = fmt(val / n) + '/mês';
  } else {
    document.getElementById('parcela-info').textContent = '';
  }
}

document.getElementById('t-parcelas').addEventListener('change', updateParcelaInfo);

function saveTransaction() {
  const desc = document.getElementById('t-desc').value.trim();
  const valor = getCurrencyValue(document.getElementById('t-valor'));
  const cat = document.getElementById('t-cat').value;
  const conta = document.getElementById('t-conta').value;
  const dataVal = document.getElementById('t-data').value;
  const parcelas = parseInt(document.getElementById('t-parcelas').value) || 1;
  const recorrente = document.getElementById('t-recorrente').checked;

  if (!desc || valor <= 0 || !cat || !conta) { toast('Preencha todos os campos'); return; }

  const stored = loadData();
  const card = stored.cards.find(c => c.id === conta);

  if (state.editingTxId) {
    const idx = stored.transactions.findIndex(t => t.id === state.editingTxId);
    if (idx >= 0) {
      stored.transactions[idx] = { ...stored.transactions[idx], desc, valor, cat, conta, data: dataVal, tipo: state.transactionType };
      saveData('transactions', stored.transactions);
    }
    hideModal('modal-add-transaction');
    toast('Transação atualizada');
    renderPage();
    return;
  }

  if (parcelas > 1) {
    const valorParcela = valor / parcelas;
    for (let i = 0; i < parcelas; i++) {
      // Calculate billing month for each parcela
      const baseDate = new Date(dataVal + 'T12:00:00');
      baseDate.setMonth(baseDate.getMonth() + i);
      const pDataStr = baseDate.toISOString().split('T')[0];
      const bm = getBillingMonth(pDataStr, card);
      stored.transactions.push({
        id: 'tx_' + Date.now() + '_' + i,
        desc, valor: valorParcela, cat, conta,
        tipo: state.transactionType,
        data: pDataStr,
        month: bm.month, year: bm.year,
        parcelas, parcelaAtual: i + 1,
        isRecurrent: false,
      });
    }
  } else {
    const bm = getBillingMonth(dataVal, card);
    stored.transactions.push({
      id: 'tx_' + Date.now(),
      desc, valor, cat, conta,
      tipo: state.transactionType,
      data: dataVal,
      month: bm.month, year: bm.year,
      parcelas: 1, parcelaAtual: 1,
      isRecurrent: recorrente,
    });
  }

  if (recorrente && parcelas === 1) {
    stored.recurrents = stored.recurrents || [];
    stored.recurrents.push({ id: 'rec_' + Date.now(), desc, valor, cat, conta, tipo: state.transactionType });
    saveData('recurrents', stored.recurrents);
    localStorage.removeItem('mb_applied_recurrents');
  }

  saveData('transactions', stored.transactions);
  hideModal('modal-add-transaction');
  toast('Transação salva!');
  renderPage();
}

function editTransaction(id) {
  const data = loadData();
  const t = data.transactions.find(tx => tx.id === id);
  if (!t) return;
  state.editingTxId = id;
  document.getElementById('modal-add-title').textContent = 'Editar Transação';
  setTransactionType(t.tipo);
  populateCategorySelect();
  populateCardSelect();
  document.getElementById('t-desc').value = t.desc;
  setCurrencyValue(document.getElementById('t-valor'), t.valor);
  document.getElementById('t-cat').value = t.cat;
  document.getElementById('t-conta').value = t.conta;
  document.getElementById('t-data').value = t.data;
  document.getElementById('t-recorrente').checked = t.isRecurrent || false;
  const footer = document.querySelector('#modal-add-transaction .modal-footer');
  if (!footer.querySelector('.btn-delete')) {
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.style.cssText = 'flex:none;padding:13px 16px;background:var(--red-dim);color:var(--red);border:none;border-radius:var(--radius-sm);cursor:pointer;font-family:var(--font)';
    delBtn.textContent = 'Excluir';
    delBtn.onclick = () => deleteTransaction(id);
    footer.insertBefore(delBtn, footer.firstChild);
  }
  showModal('modal-add-transaction');
}

function deleteTransaction(id) {
  const data = loadData();
  data.transactions = data.transactions.filter(t => t.id !== id);
  saveData('transactions', data.transactions);
  hideModal('modal-add-transaction');
  toast('Transação excluída');
  const btn = document.querySelector('#modal-add-transaction .btn-delete');
  if (btn) btn.remove();
  renderPage();
}

// ===== CARDS =====
const CARD_COLORS = ['#c8f135','#60a5fa','#4ade80','#f472b6','#fb923c','#a78bfa','#fbbf24','#34d399','#f87171','#38bdf8'];

function renderColorDots() {
  const el = document.getElementById('color-picker');
  if (!el) return;
  el.innerHTML = CARD_COLORS.map(c =>
    `<div class="color-dot ${c === state.selectedColor ? 'selected' : ''}" style="background:${c}" onclick="selectColor('${c}')"></div>`
  ).join('');
}

function selectColor(c) { state.selectedColor = c; renderColorDots(); }

function resetCardForm() {
  document.getElementById('c-nome').value = '';
  const limiteEl = document.getElementById('c-limite');
  limiteEl.value = '';
  limiteEl.dataset.cents = '';
  document.getElementById('c-fechamento').value = '';
  document.getElementById('c-vencimento').value = '';
  document.getElementById('c-tipo').value = 'conta';
  document.getElementById('c-save-btn').textContent = 'Adicionar';
  state.editingCardId = null;
}

function saveCard() {
  const nome = document.getElementById('c-nome').value.trim();
  const tipo = document.getElementById('c-tipo').value;
  const limite = getCurrencyValue(document.getElementById('c-limite'));
  const fechamento = parseInt(document.getElementById('c-fechamento').value) || 0;
  const vencimento = parseInt(document.getElementById('c-vencimento').value) || 0;
  if (!nome) { toast('Digite um nome'); return; }
  const data = loadData();
  if (state.editingCardId) {
    const idx = data.cards.findIndex(c => c.id === state.editingCardId);
    if (idx >= 0) {
      data.cards[idx] = { ...data.cards[idx], nome, tipo, limite, cor: state.selectedColor, fechamento, vencimento };
      toast('Cartão atualizado!');
    }
    state.editingCardId = null;
  } else {
    data.cards.push({ id: 'c_' + Date.now(), nome, tipo, limite, cor: state.selectedColor, fechamento, vencimento });
    toast('Conta adicionada!');
  }
  saveData('cards', data.cards);
  resetCardForm();
  renderCardsList();
}

function editCard(id) {
  const data = loadData();
  const c = data.cards.find(c => c.id === id);
  if (!c) return;
  state.editingCardId = id;
  state.selectedColor = c.cor;
  document.getElementById('c-nome').value = c.nome;
  document.getElementById('c-tipo').value = c.tipo;
  setCurrencyValue(document.getElementById('c-limite'), c.limite || 0);
  document.getElementById('c-fechamento').value = c.fechamento || '';
  document.getElementById('c-vencimento').value = c.vencimento || '';
  document.getElementById('c-save-btn').textContent = 'Salvar edição';
  renderColorDots();
  // Scroll to form
  document.querySelector('#modal-cards .modal-body').scrollTo({ top: 999, behavior: 'smooth' });
}

function renderCardsList() {
  const data = loadData();
  const el = document.getElementById('cards-list');
  if (!el) return;
  el.innerHTML = data.cards.map(c =>
    `<div class="card-list-item">
      <div class="card-dot" style="background:${c.cor}"></div>
      <div style="flex:1">
        <div class="card-list-name">${c.nome}</div>
        <div class="card-list-info">${c.tipo}${c.limite > 0 ? ' · Limite: ' + fmt(c.limite) : ''}${c.fechamento ? ' · Fecha dia ' + c.fechamento : ''}${c.vencimento ? ' · Vence dia ' + c.vencimento : ''}</div>
      </div>
      <button onclick="editCard('${c.id}')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:14px;padding:0 8px">✏️</button>
      <button class="card-list-del" onclick="deleteCard('${c.id}')">×</button>
    </div>`
  ).join('') || '<div style="color:var(--text3);font-size:13px">Nenhuma conta cadastrada</div>';
  renderColorDots();
}

function deleteCard(id) {
  const data = loadData();
  data.cards = data.cards.filter(c => c.id !== id);
  saveData('cards', data.cards);
  renderCardsList();
}

// ===== CATEGORIES =====
const EMOJIS = ['🛒','🚗','🏠','💊','🎮','📚','👕','📺','💰','💻','📈','📦','✈️','🍕','☕','🎵','🐾','🏋️','💈','🎓','🎁','🌿','🔧','📱','🏖️','🎯','💎','🚀'];

function renderEmojiPicker(containerId, stateKey) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = EMOJIS.map(e =>
    `<div class="emoji-opt ${e === state[stateKey] ? 'selected' : ''}" onclick="selectEmoji('${e}','${containerId}','${stateKey}')">${e}</div>`
  ).join('');
}

function selectEmoji(e, containerId, stateKey) { state[stateKey] = e; renderEmojiPicker(containerId, stateKey); }

function saveCategory() {
  const nome = document.getElementById('cat-nome').value.trim();
  const tipo = document.getElementById('cat-tipo').value;
  const recorrente = document.getElementById('cat-recorrente').checked;
  if (!nome) { toast('Digite um nome'); return; }
  const data = loadData();
  if (state.editingCatId) {
    const idx = data.categories.findIndex(c => c.id === state.editingCatId);
    if (idx >= 0) {
      data.categories[idx] = { ...data.categories[idx], nome, icon: state.selectedEmoji, tipo, recorrente };
      toast('Categoria atualizada!');
    }
    state.editingCatId = null;
  } else {
    data.categories.push({ id: 'cat_' + Date.now(), nome, icon: state.selectedEmoji, tipo, recorrente });
    toast('Categoria adicionada!');
  }
  saveData('categories', data.categories);
  document.getElementById('cat-nome').value = '';
  document.getElementById('cat-recorrente').checked = false;
  document.getElementById('cat-save-btn').textContent = 'Adicionar';
  renderCategoriesList();
}

function editCategory(id) {
  const data = loadData();
  const cat = data.categories.find(c => c.id === id);
  if (!cat) return;
  state.editingCatId = id;
  state.selectedEmoji = cat.icon;
  document.getElementById('cat-nome').value = cat.nome;
  document.getElementById('cat-tipo').value = cat.tipo;
  document.getElementById('cat-recorrente').checked = cat.recorrente;
  document.getElementById('cat-save-btn').textContent = 'Salvar edição';
  renderEmojiPicker('emoji-picker', 'selectedEmoji');
}

function renderCategoriesList() {
  const data = loadData();
  const el = document.getElementById('categories-list');
  if (!el) return;
  el.innerHTML = data.categories.map(c =>
    `<div class="card-list-item">
      <span style="font-size:18px">${c.icon}</span>
      <div style="flex:1">
        <div class="card-list-name">${c.nome}</div>
        <div class="card-list-info">${c.tipo === 'expense' ? 'Gasto' : c.tipo === 'income' ? 'Receita' : 'Ambos'}${c.recorrente ? ' · 🔁' : ''}</div>
      </div>
      <button onclick="editCategory('${c.id}')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:14px;padding:0 8px">✏️</button>
      <button class="card-list-del" onclick="deleteCategory('${c.id}')">×</button>
    </div>`
  ).join('');
}

function deleteCategory(id) {
  const data = loadData();
  data.categories = data.categories.filter(c => c.id !== id);
  saveData('categories', data.categories);
  renderCategoriesList();
}

// ===== BUDGET MODAL =====
function renderBudgetModal() {
  const data = loadData();
  const expenseCats = data.categories.filter(c => c.tipo === 'expense' || c.tipo === 'both');
  document.getElementById('budget-list').innerHTML = expenseCats.map(c => {
    const val = data.budgets[c.id] || '';
    return `<div class="card-list-item">
      <span style="font-size:18px">${c.icon}</span>
      <div class="card-list-name" style="flex:1">${c.nome}</div>
      <input type="text" inputmode="numeric" placeholder="R$ 0,00" value="${val ? val.toLocaleString('pt-BR',{minimumFractionDigits:2}) : ''}"
        id="bud_${c.id}" style="width:110px;text-align:right">
    </div>`;
  }).join('');
  // Setup currency inputs
  expenseCats.forEach(c => {
    const el = document.getElementById('bud_' + c.id);
    if (el) setupCurrencyInput(el);
  });
}

function saveBudgets() {
  const data = loadData();
  const expenseCats = data.categories.filter(c => c.tipo === 'expense' || c.tipo === 'both');
  expenseCats.forEach(c => {
    const el = document.getElementById('bud_' + c.id);
    if (el) data.budgets[c.id] = getCurrencyValue(el);
  });
  saveData('budgets', data.budgets);
  toast('Orçamento salvo!');
}

// ===== GOALS =====
function setGoalType(type) {
  state.goalType = type;
  document.getElementById('goal-type-monthly').classList.toggle('active', type === 'monthly');
  document.getElementById('goal-type-total').classList.toggle('active', type === 'total');
  document.getElementById('g-valor-label').textContent = type === 'monthly' ? 'Valor mensal a economizar (R$)' : 'Já tenho guardado (R$)';
  document.getElementById('g-total-group').style.display = type === 'total' ? 'block' : 'none';
}

function renderGoalEmojiPicker() { renderEmojiPicker('goal-emoji-picker', 'selectedGoalEmoji'); }

function saveGoal() {
  const nome = document.getElementById('g-nome').value.trim();
  const valor = getCurrencyValue(document.getElementById('g-valor'));
  if (!nome || valor <= 0) { toast('Preencha nome e valor'); return; }
  const data = loadData();
  const goal = { id: 'g_' + Date.now(), nome, icon: state.selectedGoalEmoji, tipo: state.goalType, valor };
  if (state.goalType === 'total') {
    goal.total = getCurrencyValue(document.getElementById('g-total'));
    goal.atual = valor;
  }
  data.goals.push(goal);
  saveData('goals', data.goals);
  hideModal('modal-add-goal');
  toast('Meta criada!');
  renderPage();
}

function depositGoal(id) {
  const valStr = prompt('Quanto deseja adicionar à meta? (ex: 150,00)');
  if (!valStr) return;
  const val = parseFloat(valStr.replace(',', '.'));
  if (isNaN(val) || val <= 0) return;
  const data = loadData();
  const g = data.goals.find(g => g.id === id);
  if (g) { g.atual = (g.atual || 0) + val; saveData('goals', data.goals); renderPage(); toast('Depósito registrado!'); }
}

function deleteGoal(id) {
  const data = loadData();
  data.goals = data.goals.filter(g => g.id !== id);
  saveData('goals', data.goals);
  renderPage();
  toast('Meta excluída');
}

function renderGoals() {
  const data = loadData();
  const txs = getMonthTx(state.currentMonth, state.currentYear);
  const { income, expense } = getTxTotals(txs);
  const saved = income - expense;

  return `
    <div class="balance-card" style="margin-bottom:16px">
      <div class="balance-label">Economia este mês</div>
      <div class="balance-value ${saved >= 0 ? 'positive' : 'negative'}">${fmtSign(saved)}</div>
    </div>
    ${data.goals.map(g => {
      if (g.tipo === 'monthly') {
        const pct = g.valor > 0 ? Math.min(saved / g.valor * 100, 100) : 0;
        return `<div class="goal-card">
          <div class="goal-header">
            <div class="goal-icon-name"><span class="goal-icon">${g.icon}</span><span class="goal-name">${g.nome}</span></div>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="goal-type-badge">Mensal</span>
              <button onclick="deleteGoal('${g.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px">×</button>
            </div>
          </div>
          <div class="goal-values">
            <div><div class="goal-val-label">Economizado</div><div class="goal-val" style="color:${saved >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(Math.max(saved, 0))}</div></div>
            <div style="text-align:right"><div class="goal-val-label">Meta mensal</div><div class="goal-val">${fmt(g.valor)}</div></div>
          </div>
          <div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
          <div class="goal-pct">${Math.round(pct)}% atingido</div>
        </div>`;
      } else {
        const pct = g.total > 0 ? Math.min((g.atual || 0) / g.total * 100, 100) : 0;
        return `<div class="goal-card">
          <div class="goal-header">
            <div class="goal-icon-name"><span class="goal-icon">${g.icon}</span><span class="goal-name">${g.nome}</span></div>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="goal-type-badge">Total</span>
              <button onclick="deleteGoal('${g.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px">×</button>
            </div>
          </div>
          <div class="goal-values">
            <div><div class="goal-val-label">Guardado</div><div class="goal-val" style="color:var(--accent)">${fmt(g.atual || 0)}</div></div>
            <div style="text-align:right"><div class="goal-val-label">Meta total</div><div class="goal-val">${fmt(g.total || 0)}</div></div>
          </div>
          <div class="goal-bar"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">
            <button class="goal-deposit-btn" onclick="depositGoal('${g.id}')">+ Adicionar valor</button>
            <span class="goal-pct">${Math.round(pct)}%</span>
          </div>
        </div>`;
      }
    }).join('')}
    <button class="goal-add-btn" onclick="showModal('modal-add-goal')">+ Nova meta</button>
  `;
}

// ===== REPORTS =====
function renderReports() {
  const data = loadData();
  let txs = [];
  const now = { m: state.currentMonth, y: state.currentYear };
  const periods = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 };
  const count = periods[state.reportPeriod] || 1;
  for (let i = 0; i < count; i++) {
    let m = now.m - i; let y = now.y;
    if (m < 0) { m += 12; y--; }
    txs = txs.concat(getMonthTx(m, y));
  }

  const { income, expense, balance } = getTxTotals(txs);
  const catExpenses = {};
  txs.filter(t => t.tipo === 'expense').forEach(t => { catExpenses[t.cat] = (catExpenses[t.cat] || 0) + t.valor; });
  const sortedCats = Object.entries(catExpenses).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = sortedCats[0] ? sortedCats[0][1] : 1;
  const PIE_COLORS = ['#c8f135','#60a5fa','#4ade80','#f472b6','#fbbf24','#fb923c'];

  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    let m = now.m - i; let y = now.y;
    if (m < 0) { m += 12; y--; }
    const mtxs = getMonthTx(m, y);
    const { income: inc, expense: exp } = getTxTotals(mtxs);
    monthlyData.push({ label: MONTHS[m].slice(0, 3), income: inc, expense: exp });
  }
  const maxLine = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1);

  return `
    <div class="report-period">
      ${['1m','3m','6m','12m'].map(p => `<button class="period-btn ${state.reportPeriod === p ? 'active' : ''}" onclick="setReportPeriod('${p}')">${p === '1m' ? 'Este mês' : p === '3m' ? '3 meses' : p === '6m' ? '6 meses' : '12 meses'}</button>`).join('')}
    </div>
    <div class="summary-stats">
      <div class="stat-box"><div class="stat-box-label">Receitas</div><div class="stat-box-val" style="color:var(--green)">${fmt(income)}</div></div>
      <div class="stat-box"><div class="stat-box-label">Gastos</div><div class="stat-box-val" style="color:var(--red)">${fmt(expense)}</div></div>
      <div class="stat-box"><div class="stat-box-label">Saldo</div><div class="stat-box-val" style="color:${balance >= 0 ? 'var(--accent)' : 'var(--red)'}">${fmt(balance)}</div></div>
    </div>
    <div class="chart-container">
      <div class="chart-title">Gastos por categoria</div>
      ${sortedCats.length ? sortedCats.map(([catId, val], i) => {
        const cat = data.categories.find(c => c.id === catId);
        const pct = Math.round(val / maxCat * 100);
        const color = PIE_COLORS[i % PIE_COLORS.length];
        return `<div class="bar-chart-row">
          <div class="bar-chart-label">${cat ? cat.icon + ' ' + cat.nome : '—'}</div>
          <div class="bar-chart-outer"><div class="bar-chart-inner" style="width:${pct}%;background:${color};min-width:${val > 0 ? '4px' : '0'}">${pct > 20 ? fmt(val) : ''}</div></div>
          <div class="bar-chart-val">${fmt(val)}</div>
        </div>`;
      }).join('') : '<div style="color:var(--text3);font-size:13px">Sem dados</div>'}
    </div>
    <div class="chart-container">
      <div class="chart-title">Distribuição (%)</div>
      <div class="pie-chart-wrap">
        <svg width="100" height="100" viewBox="0 0 36 36">${renderPie(sortedCats, expense, PIE_COLORS)}</svg>
        <div class="pie-legend">
          ${sortedCats.slice(0, 5).map(([catId, val], i) => {
            const cat = data.categories.find(c => c.id === catId);
            const pct = expense > 0 ? Math.round(val / expense * 100) : 0;
            return `<div class="pie-legend-item"><div class="pie-dot" style="background:${PIE_COLORS[i % PIE_COLORS.length]}"></div><span>${cat ? cat.nome : '—'} ${pct}%</span></div>`;
          }).join('')}
        </div>
      </div>
    </div>
    <div class="chart-container">
      <div class="chart-title">Evolução mensal (últimos 6 meses)</div>
      <div style="display:flex;gap:4px;align-items:flex-end;height:100px;padding-bottom:20px">
        ${monthlyData.map(d => {
          const incH = Math.round(d.income / maxLine * 80);
          const expH = Math.round(d.expense / maxLine * 80);
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
            <div style="width:100%;display:flex;gap:2px;align-items:flex-end;height:80px">
              <div style="flex:1;height:${incH}px;background:var(--green);border-radius:2px 2px 0 0;min-height:2px"></div>
              <div style="flex:1;height:${expH}px;background:var(--red);border-radius:2px 2px 0 0;min-height:2px"></div>
            </div>
            <div style="font-size:9px;color:var(--text3);font-family:var(--mono)">${d.label}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:4px">
        <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text2)"><div style="width:8px;height:8px;background:var(--green);border-radius:2px"></div>Receita</div>
        <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text2)"><div style="width:8px;height:8px;background:var(--red);border-radius:2px"></div>Gasto</div>
      </div>
    </div>
  `;
}

function renderPie(cats, total, colors) {
  if (!total || !cats.length) return '<circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg4)" stroke-width="3"/>';
  let offset = 0;
  return cats.map(([, val], i) => {
    const pct = val / total * 100;
    const dashoffset = 100 - offset;
    offset += pct;
    return `<circle cx="18" cy="18" r="15.9" fill="none" stroke="${colors[i % colors.length]}" stroke-width="3" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${dashoffset}" transform="rotate(-90 18 18)"/>`;
  }).join('');
}

function setReportPeriod(p) { state.reportPeriod = p; renderPage(); }

// ===== SETTINGS =====
function confirmClearData() {
  if (confirm('Tem certeza? Todos os dados serão apagados permanentemente.')) {
    localStorage.clear();
    toast('Dados apagados!');
    renderPage();
  }
}

// ===== TOAST =====
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(() => {}); }

// ===== INIT =====
// Setup currency inputs after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setupCurrencyInput(document.getElementById('t-valor'));
  setupCurrencyInput(document.getElementById('c-limite'));
  setupCurrencyInput(document.getElementById('g-valor'));
  setupCurrencyInput(document.getElementById('g-total'));
  setupCurrencyInput(document.getElementById('g-atual'));
});

applyRecurrents();
updateHeader();
renderPage();

// Setup currency inputs immediately too
setTimeout(() => {
  const tValor = document.getElementById('t-valor');
  const cLimite = document.getElementById('c-limite');
  const gValor = document.getElementById('g-valor');
  const gTotal = document.getElementById('g-total');
  const gAtual = document.getElementById('g-atual');
  if (tValor) setupCurrencyInput(tValor);
  if (cLimite) setupCurrencyInput(cLimite);
  if (gValor) setupCurrencyInput(gValor);
  if (gTotal) setupCurrencyInput(gTotal);
  if (gAtual) setupCurrencyInput(gAtual);
}, 100);
