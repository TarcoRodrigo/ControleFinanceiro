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
  editingFixoId: null,
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
    fixos: JSON.parse(localStorage.getItem('mb_fixos') || '[]'),
    fixos_status: JSON.parse(localStorage.getItem('mb_fixos_status') || '{}'),
    guardar: JSON.parse(localStorage.getItem('mb_guardar') || '{}'),
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
  const titles = { dashboard: 'Início', transactions: 'Transações', reports: 'Relatórios', goals: 'Metas', card_detail: 'Detalhes do Cartão', fixos: 'Gastos Fixos', guardar: 'Guardar Dinheiro' };
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
  const now = new Date();
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();
  // Only apply recurrents up to the real current month, never future
  const targetMonth = state.currentMonth;
  const targetYear = state.currentYear;
  // Don't apply to future months
  const targetDate = new Date(targetYear, targetMonth, 1);
  const nowDate = new Date(nowYear, nowMonth, 1);
  if (targetDate > nowDate) return;

  const key = `${targetYear}-${targetMonth}`;
  const applied = JSON.parse(localStorage.getItem('mb_applied_recurrents') || '{}');
  if (applied[key]) return;
  let changed = false;
  data.recurrents.forEach(r => {
    const exists = data.transactions.some(t => t.recurrentId === r.id && t.month === targetMonth && t.year === targetYear);
    if (!exists) {
      data.transactions.push({
        id: 'tx_' + Date.now() + '_' + Math.random(),
        desc: r.desc, valor: r.valor, cat: r.cat, conta: r.conta,
        tipo: r.tipo, data: `${targetYear}-${String(targetMonth+1).padStart(2,'0')}-01`,
        month: targetMonth, year: targetYear,
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

function navigateFiltered(filter) {
  state.txFilter = filter;
  navigate('transactions');
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
    case 'fixos': main.innerHTML = renderFixos(); break;
    case 'guardar': main.innerHTML = renderGuardar(); setupAllCurrencyInputs(); break;
  }
}

// ===== FORMAT =====
function fmt(v) { return 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtSign(v) { return (v >= 0 ? '+' : '-') + ' R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ===== CURRENCY INPUT =====
function setupCurrencyInput(el) {
  if (!el || el.dataset.currencySetup) return;
  el.dataset.currencySetup = '1';
  el.setAttribute('inputmode', 'numeric');
  el.setAttribute('placeholder', 'R$ 0,00');
  el.type = 'text';
  el.addEventListener('input', function() {
    let raw = this.value.replace(/\D/g, '');
    if (!raw) { this.value = ''; this.dataset.cents = ''; return; }
    let cents = parseInt(raw, 10);
    let reais = cents / 100;
    this.value = reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    this.dataset.cents = cents;
  });
}

function setupAllCurrencyInputs() {
  const ids = ['t-valor','c-limite','g-valor','g-total','g-atual','fx-valor','gd-valor','gd-meta'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) setupCurrencyInput(el);
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
      <div class="mini-card mini-card-btn" onclick="navigateFiltered('income')" style="cursor:pointer">
        <div class="mini-card-label">Receitas ›</div>
        <div class="mini-card-value income">${fmt(income)}</div>
      </div>
      <div class="mini-card mini-card-btn" onclick="navigateFiltered('expense')" style="cursor:pointer">
        <div class="mini-card-label">Gastos ›</div>
        <div class="mini-card-value expense">${fmt(expense)}</div>
      </div>
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

function addGastoNoCartao(cardId) {
  // Open add transaction modal pre-filled with this card
  state.editingTxId = null;
  document.getElementById('modal-add-title').textContent = 'Novo Gasto no Cartão';
  const delBtn = document.querySelector('#modal-add-transaction .btn-delete');
  if (delBtn) delBtn.remove();
  const valorEl = document.getElementById('t-valor');
  valorEl.value = ''; valorEl.dataset.cents = '';
  document.getElementById('t-desc').value = '';
  document.getElementById('t-data').value = new Date().toISOString().split('T')[0];
  document.getElementById('t-parcelas').value = '1';
  document.getElementById('t-recorrente').checked = false;
  document.getElementById('parcela-info').textContent = '';
  setTransactionType('expense');
  populateCategorySelect();
  populateCardSelect();
  // Pre-select the card
  const contaSel = document.getElementById('t-conta');
  if (contaSel) contaSel.value = cardId;
  // Show parcelas since it's a credit card context
  document.getElementById('parcelas-group').style.display = 'block';
  document.getElementById('modal-add-transaction').classList.add('open');
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

  // Calculate total of all future faturas (excluding current)
  const totalFuturo = futureFaturas
    .filter(g => !(g.month === state.currentMonth && g.year === state.currentYear))
    .reduce((s, g) => s + g.total, 0);

  // Total comprometido = current + future
  const totalComprometido = futureFaturas.reduce((s, g) => s + g.total, 0);
  const limitDispReal = card.limite > 0 ? card.limite - totalComprometido : null;

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <button onclick="navigate('dashboard')" style="background:none;border:none;color:var(--accent);font-family:var(--font);font-size:14px;cursor:pointer;padding:0">← Voltar</button>
      <button onclick="addGastoNoCartao('${card.id}')" style="background:var(--accent);color:#0f0f0f;border:none;border-radius:var(--radius-sm);padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font)">+ Novo gasto</button>
    </div>

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

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:${card.limite > 0 ? '12px' : '0'}">
        <div>
          <div class="balance-label">Fatura atual</div>
          <div style="font-size:22px;font-weight:600;font-family:var(--mono);color:${color}">${fmt(curUsed)}</div>
          ${card.vencimento ? `<div style="font-size:10px;color:var(--amber);margin-top:2px">Vence dia ${card.vencimento}</div>` : ''}
        </div>
        ${totalFuturo > 0 ? `<div>
          <div class="balance-label">Próximas faturas</div>
          <div style="font-size:22px;font-weight:600;font-family:var(--mono);color:var(--amber)">${fmt(totalFuturo)}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">já comprometido</div>
        </div>` : '<div></div>'}
      </div>

      ${card.limite > 0 ? `
        <div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:4px">
            <span>Limite comprometido (atual + futuro)</span><span>${fmt(totalComprometido)} / ${fmt(card.limite)}</span>
          </div>
          <div class="budget-bar"><div class="budget-bar-fill" style="width:${Math.min(totalComprometido/card.limite*100,100)}%;background:${color}"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:6px">
            <div style="font-size:11px;color:var(--text2)">Disponível real: <span style="color:var(--green);font-family:var(--mono);font-weight:500">${fmt(Math.max(limitDispReal,0))}</span></div>
            <div style="font-size:11px;color:var(--text2)">Limite: <span style="font-family:var(--mono)">${fmt(card.limite)}</span></div>
          </div>
        </div>
      ` : ''}
    </div>

    ${futureFaturas.length ? `
      <div class="section-header"><span class="section-title">Faturas</span></div>
      ${futureFaturas.map(g => renderFaturaGroup(g, card, data, g.month !== state.currentMonth || g.year !== state.currentYear)).join('')}
    ` : ''}

    ${pastFaturas.length ? `
      <div class="section-header" style="margin-top:8px"><span class="section-title">Faturas anteriores</span></div>
      ${pastFaturas.map(g => renderFaturaGroup(g, card, data, true)).join('')}
    ` : ''}

    ${!sorted.length ? `<div class="empty-state"><div class="empty-state-icon">💳</div>Nenhum gasto neste cartão<br><button onclick="addGastoNoCartao('` + card.id + `')" style="margin-top:12px;background:var(--accent);color:#0f0f0f;border:none;border-radius:var(--radius-sm);padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font)">+ Adicionar primeiro gasto</button></div>` : ''}
  `;
}

function renderFaturaGroup(g, card, data, collapsed) {
  const id = `fatura_${g.year}_${g.month}`;
  const today = new Date();
  const isFuture = new Date(g.year, g.month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  const isCurrent = g.month === today.getMonth() && g.year === today.getFullYear();

  // Close date = fechamento day of the billing month
  const closeDate = card.fechamento ? `Fecha ${card.fechamento}/${String(g.month+1).padStart(2,'0')}` : '';
  // Due date = vencimento day of the NEXT month after closing
  let dueMonth = g.month + 1; let dueYear = g.year;
  if (dueMonth > 11) { dueMonth = 0; dueYear++; }
  const dueDate = card.vencimento ? `Vence ${card.vencimento}/${String(dueMonth+1).padStart(2,'0')}/${dueYear}` : '';

  const statusTag = isCurrent
    ? `<span style="font-size:10px;background:var(--accent-dim);color:var(--accent);padding:2px 7px;border-radius:20px">Atual</span>`
    : isFuture
    ? `<span style="font-size:10px;background:var(--amber-dim);color:var(--amber);padding:2px 7px;border-radius:20px">Futura</span>`
    : `<span style="font-size:10px;background:var(--bg4);color:var(--text3);padding:2px 7px;border-radius:20px">Fechada</span>`;

  return `<div class="chart-container" style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleFatura('${id}')">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:14px;font-weight:500">${MONTHS[g.month]} ${g.year}</span>
          ${statusTag}
        </div>
        <div style="font-size:18px;font-weight:600;font-family:var(--mono);color:${isCurrent ? 'var(--text)' : isFuture ? 'var(--amber)' : 'var(--text2)'}">${fmt(g.total)}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">${[closeDate, dueDate].filter(Boolean).join(' · ')}</div>
      </div>
      <span style="color:var(--text3);font-size:18px;margin-left:12px" id="arr_${id}">${collapsed ? '›' : '⌄'}</span>
    </div>
    <div id="${id}" style="display:${collapsed ? 'none' : 'block'};margin-top:10px;border-top:1px solid var(--line);padding-top:10px">
      ${g.txs.sort((a,b) => new Date(b.data)-new Date(a.data)).map(t => {
        const cat = data.categories.find(c => c.id === t.cat);
        const parcelaTag = t.parcelas > 1 ? `<span class="tx-parcela-badge">${t.parcelaAtual}/${t.parcelas}x</span>` : '';
        return `<div class="tx-item" style="margin-bottom:6px"
          onclick="if(!longPressTriggered)editTransaction('${t.id}');longPressTriggered=false;"
          oncontextmenu="showTxMenu(event,'${t.id}');return false;"
          ontouchstart="startLongPress(event,'${t.id}')"
          ontouchend="cancelLongPress()"
          ontouchmove="cancelLongPress()">
          <div class="tx-icon" style="background:${cat ? '#ff5c5c22' : 'var(--bg3)'};width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">${cat ? cat.icon : '📦'}</div>
          <div class="tx-info">
            <div class="tx-desc">${t.desc} ${parcelaTag}</div>
            <div class="tx-meta">${cat ? cat.nome : '—'} · ${new Date(t.data+'T12:00:00').toLocaleDateString('pt-BR')}</div>
          </div>
          <div class="tx-amount expense">-${fmt(t.valor)}</div>
        </div>`;
      }).join('')}
      <button onclick="addGastoNoCartao('${card.id}')" style="width:100%;margin-top:6px;padding:10px;background:none;border:1px dashed var(--bg4);border-radius:var(--radius-sm);color:var(--text3);cursor:pointer;font-family:var(--font);font-size:13px;transition:border-color 0.15s,color 0.15s"
        onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'"
        onmouseout="this.style.borderColor='var(--bg4)';this.style.color='var(--text3)'">
        + Adicionar gasto
      </button>
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
  return `<div class="tx-item" 
    onclick="if(!longPressTriggered)editTransaction('${t.id}');longPressTriggered=false;"
    oncontextmenu="showTxMenu(event,'${t.id}');return false;"
    ontouchstart="startLongPress(event,'${t.id}')"
    ontouchend="cancelLongPress()"
    ontouchmove="cancelLongPress()">
    <div class="tx-icon" style="background:${cat ? getCatColor(cat) + '22' : 'var(--bg3)'}">${icon}</div>
    <div class="tx-info">
      <div class="tx-desc">${t.desc} ${parcelaTag} ${recTag}</div>
      <div class="tx-meta">${cat ? cat.nome : '—'} · ${cardName}</div>
    </div>
    <div class="tx-amount ${t.tipo}">${t.tipo === 'income' ? '+' : '-'}${fmt(t.valor)}</div>
  </div>`;
}

// ===== LONG PRESS CONTEXT MENU =====
let longPressTimer = null;
let longPressTriggered = false;

function startLongPress(e, txId, type) {
  cancelLongPress();
  longPressTriggered = false;
  longPressTimer = setTimeout(() => {
    longPressTriggered = true;
    if (navigator.vibrate) navigator.vibrate(60);
    if (type === 'fixo') showFixoMenu(e, txId);
    else if (type === 'deposito') showDepositoMenu(e, txId);
    else showTxMenu(e, txId);
  }, 500);
}

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
}

function showTxMenu(e, txId) {
  // Remove existing menu
  const existing = document.getElementById('tx-context-menu');
  if (existing) existing.remove();

  const data = loadData();
  const t = data.transactions.find(tx => tx.id === txId);
  if (!t) return;

  const menu = document.createElement('div');
  menu.id = 'tx-context-menu';
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="context-menu-header">${t.desc}</div>
    <button class="context-menu-item" onclick="closeTxMenu();editTransaction('${txId}')">
      <span>✏️</span><span>Editar</span>
    </button>
    <button class="context-menu-item danger" onclick="closeTxMenu();confirmDeleteTx('${txId}')">
      <span>🗑️</span><span>Excluir</span>
    </button>
    <button class="context-menu-cancel" onclick="closeTxMenu()">Cancelar</button>
  `;

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'tx-context-backdrop';
  backdrop.className = 'context-backdrop';
  backdrop.onclick = closeTxMenu;

  document.body.appendChild(backdrop);
  document.body.appendChild(menu);

  // Prevent click from also triggering editTransaction
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
}

function closeTxMenu() {
  const menu = document.getElementById('tx-context-menu');
  const backdrop = document.getElementById('tx-context-backdrop');
  if (menu) menu.remove();
  if (backdrop) backdrop.remove();
}

function confirmDeleteTx(id) {
  const data = loadData();
  const t = data.transactions.find(tx => tx.id === id);
  if (!t) return;
  if (confirm(`Excluir "${t.desc}"?`)) {
    deleteTransaction(id);
  }
}

function showFixoMenu(e, fixoId) {
  const existing = document.getElementById('tx-context-menu');
  if (existing) existing.remove();
  const existingBd = document.getElementById('tx-context-backdrop');
  if (existingBd) existingBd.remove();

  const data = loadData();
  const f = data.fixos.find(f => f.id === fixoId);
  if (!f) return;

  const menu = document.createElement('div');
  menu.id = 'tx-context-menu';
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="context-menu-header">${f.nome} · ${fmt(f.valor)}</div>
    <button class="context-menu-item" onclick="closeTxMenu();openEditFixo('${fixoId}')">
      <span>✏️</span><span>Editar</span>
    </button>
    <button class="context-menu-item danger" onclick="closeTxMenu();confirmDeleteFixo('${fixoId}')">
      <span>🗑️</span><span>Excluir</span>
    </button>
    <button class="context-menu-cancel" onclick="closeTxMenu()">Cancelar</button>
  `;

  const backdrop = document.createElement('div');
  backdrop.id = 'tx-context-backdrop';
  backdrop.className = 'context-backdrop';
  backdrop.onclick = closeTxMenu;

  document.body.appendChild(backdrop);
  document.body.appendChild(menu);
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
}

function confirmDeleteFixo(id) {
  const data = loadData();
  const f = data.fixos.find(f => f.id === id);
  if (!f) return;
  if (confirm(`Excluir "${f.nome}"?`)) {
    deleteFixo(id);
  }
}

function openEditFixo(fixoId) {
  const data = loadData();
  const f = data.fixos.find(f => f.id === fixoId);
  if (!f) return;
  state.editingFixoId = fixoId;

  // Populate selects
  const catSel = document.getElementById('fx-cat');
  catSel.innerHTML = data.categories.filter(c => c.tipo === 'expense' || c.tipo === 'both')
    .map(c => `<option value="${c.id}">${c.icon} ${c.nome}</option>`).join('');
  const contaSel = document.getElementById('fx-conta');
  contaSel.innerHTML = data.cards.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

  // Fill values
  document.getElementById('fx-nome').value = f.nome;
  const fxValor = document.getElementById('fx-valor');
  setupCurrencyInput(fxValor);
  setCurrencyValue(fxValor, f.valor);
  catSel.value = f.cat;
  contaSel.value = f.conta;
  document.getElementById('fx-dia').value = f.dia;
  document.getElementById('fx-parcela-atual').value = f.parcelaAtual || '';
  document.getElementById('fx-total-parcelas').value = f.totalParcelas || '';
  document.getElementById('fx-parcela-info').textContent = '';

  setFixoTipo(f.tipo || 'recorrente');

  // Change save button text
  document.getElementById('fx-save-btn').textContent = 'Salvar edição';
  document.getElementById('modal-add-fixo-title').textContent = 'Editar Gasto Fixo';

  document.getElementById('modal-add-fixo').classList.add('open');
}

function getCatColor(cat) {
  const colors = { expense: '#ff5c5c', income: '#4ade80', both: '#60a5fa' };
  return colors[cat.tipo] || '#888';
}

// ===== ADD TRANSACTION =====
function showModal(id) {
  setupAllCurrencyInputs();
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
    const parcelasEl = document.getElementById('t-parcelas');
    if (parcelasEl) parcelasEl.onchange = updateParcelaInfo;
    const tValorEl = document.getElementById('t-valor');
    if (tValorEl) tValorEl.oninput = updateParcelaInfo;
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



// ===== GUARDAR DINHEIRO =====

function getGuardarMonth() {
  const data = loadData();
  const key = `${state.currentYear}_${state.currentMonth}`;
  return data.guardar[key] || { meta: 0, depositos: [] };
}

function saveGuardarMonth(obj) {
  const data = loadData();
  const key = `${state.currentYear}_${state.currentMonth}`;
  data.guardar[key] = obj;
  saveData('guardar', data.guardar);
}

function adicionarDeposito() {
  const valor = getCurrencyValue(document.getElementById('gd-valor'));
  const desc = document.getElementById('gd-desc').value.trim() || 'Depósito';
  if (valor <= 0) { toast('Digite um valor'); return; }

  const mes = getGuardarMonth();
  mes.depositos.push({
    id: 'dep_' + Date.now(),
    valor, desc,
    data: new Date().toISOString().split('T')[0],
  });
  saveGuardarMonth(mes);

  const el = document.getElementById('gd-valor');
  el.value = ''; el.dataset.cents = '';
  document.getElementById('gd-desc').value = '';
  toast('Depósito registrado!');
  renderPage();
}

function salvarMetaMensal() {
  const valor = getCurrencyValue(document.getElementById('gd-meta'));
  const mes = getGuardarMonth();
  mes.meta = valor;
  saveGuardarMonth(mes);
  toast('Meta salva!');
  renderPage();
}

function excluirDeposito(depId) {
  const mes = getGuardarMonth();
  mes.depositos = mes.depositos.filter(d => d.id !== depId);
  saveGuardarMonth(mes);
  toast('Depósito removido');
  renderPage();
}

function renderGuardar() {
  const mes = getGuardarMonth();
  const meta = mes.meta || 0;
  const depositos = mes.depositos || [];
  const total = depositos.reduce((s, d) => s + d.valor, 0);
  const pct = meta > 0 ? (total / meta * 100) : 0;
  const pctDisplay = Math.round(pct);
  const falta = Math.max(meta - total, 0);
  const excedente = Math.max(total - meta, 0);

  // Bar color based on progress
  const barColor = pct >= 100 ? 'var(--accent)' : pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--blue)' : 'var(--text3)';
  // Bar width capped at 100% visually but label shows real %
  const barWidth = Math.min(pct, 100);
  // Extra bar for over 100%
  const overPct = pct > 100 ? Math.min(pct - 100, 100) : 0;

  // All-time total (across all months)
  const data = loadData();
  const allTimeTotal = Object.values(data.guardar).reduce((s, m) => {
    return s + (m.depositos || []).reduce((ss, d) => ss + d.valor, 0);
  }, 0);

  return `
    <!-- Summary cards -->
    <div class="mini-cards" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
      <div class="mini-card">
        <div class="mini-card-label">Guardado este mês</div>
        <div class="mini-card-value income">${fmt(total)}</div>
      </div>
      <div class="mini-card">
        <div class="mini-card-label">Meta mensal</div>
        <div class="mini-card-value">${meta > 0 ? fmt(meta) : '—'}</div>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="chart-container" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
        <div style="font-size:13px;color:var(--text2)">Progresso do mês</div>
        <div style="font-size:24px;font-weight:600;font-family:var(--mono);color:${barColor}">${pctDisplay}%</div>
      </div>

      <!-- Main bar -->
      <div style="height:28px;background:var(--bg4);border-radius:6px;overflow:hidden;margin-bottom:6px;position:relative">
        <div style="height:100%;width:${barWidth}%;background:${barColor};border-radius:6px;transition:width 0.5s;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;min-width:${total>0?'4px':'0'}">
          ${barWidth > 20 ? `<span style="font-size:11px;font-weight:600;color:${pct>=100?'#0f0f0f':'white'}">${fmt(total)}</span>` : ''}
        </div>
      </div>

      ${overPct > 0 ? `
      <!-- Extra bar for over 100% -->
      <div style="height:8px;background:var(--bg4);border-radius:4px;overflow:hidden;margin-bottom:6px">
        <div style="height:100%;width:${overPct}%;background:var(--accent);border-radius:4px;transition:width 0.5s"></div>
      </div>
      <div style="font-size:11px;color:var(--accent);text-align:right">🎉 +${fmt(excedente)} além da meta!</div>
      ` : ''}

      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-top:4px">
        <span>R$ 0</span>
        ${meta > 0 && falta > 0 ? `<span style="color:var(--text2)">Falta ${fmt(falta)}</span>` : ''}
        <span>${meta > 0 ? fmt(meta) : ''}</span>
      </div>
    </div>

    <!-- Set meta -->
    <div class="chart-container" style="margin-bottom:12px">
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Meta do mês</div>
      <div style="display:flex;gap:8px">
        <input type="text" id="gd-meta" inputmode="numeric" placeholder="R$ 0,00"
          value="${meta > 0 ? meta.toLocaleString('pt-BR',{minimumFractionDigits:2}) : ''}"
          style="flex:1" onkeydown="if(event.key==='Enter')salvarMetaMensal()">
        <button onclick="salvarMetaMensal()" style="padding:10px 16px;background:var(--bg3);border:1px solid var(--line);border-radius:var(--radius-sm);color:var(--text);cursor:pointer;font-family:var(--font);font-size:13px;white-space:nowrap">Definir</button>
      </div>
    </div>

    <!-- Add deposit -->
    <div class="chart-container" style="margin-bottom:12px">
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Adicionar depósito</div>
      <div class="form-group" style="margin-bottom:10px">
        <input type="text" id="gd-valor" inputmode="numeric" placeholder="R$ 0,00"
          onkeydown="if(event.key==='Enter')adicionarDeposito()">
      </div>
      <div style="display:flex;gap:8px">
        <input type="text" id="gd-desc" placeholder="Descrição (opcional)" style="flex:1">
        <button onclick="adicionarDeposito()" style="padding:10px 16px;background:var(--accent);color:#0f0f0f;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font);white-space:nowrap">+ Guardar</button>
      </div>
    </div>

    <!-- Deposits list -->
    ${depositos.length ? `
      <div class="section-header"><span class="section-title">Depósitos do mês</span></div>
      ${[...depositos].reverse().map(d => `
        <div class="tx-item"
          oncontextmenu="showDepositoMenu(event,'${d.id}');return false;"
          ontouchstart="startLongPress(event,'${d.id}','deposito')"
          ontouchend="cancelLongPress()"
          ontouchmove="cancelLongPress()">
          <div class="tx-icon" style="background:var(--green-dim);font-size:18px">💰</div>
          <div class="tx-info">
            <div class="tx-desc">${d.desc}</div>
            <div class="tx-meta">${new Date(d.data+'T12:00:00').toLocaleDateString('pt-BR')}</div>
          </div>
          <div class="tx-amount income">+${fmt(d.valor)}</div>
        </div>
      `).join('')}
    ` : '<div class="empty-state" style="padding:20px 0"><div class="empty-state-icon">🏦</div>Nenhum depósito este mês</div>'}

    <!-- All time total -->
    ${allTimeTotal > 0 ? `
      <div style="text-align:center;margin-top:20px;padding:16px;border-top:1px solid var(--line)">
        <div style="font-size:12px;color:var(--text3);margin-bottom:4px">Total guardado (todos os meses)</div>
        <div style="font-size:22px;font-weight:600;font-family:var(--mono);color:var(--accent)">${fmt(allTimeTotal)}</div>
      </div>
    ` : ''}
  `;
}

function showDepositoMenu(e, depId) {
  const existing = document.getElementById('tx-context-menu');
  if (existing) existing.remove();
  const existingBd = document.getElementById('tx-context-backdrop');
  if (existingBd) existingBd.remove();

  const menu = document.createElement('div');
  menu.id = 'tx-context-menu';
  menu.className = 'context-menu';
  menu.innerHTML = `
    <div class="context-menu-header">Depósito</div>
    <button class="context-menu-item danger" onclick="closeTxMenu();excluirDeposito('${depId}')">
      <span>🗑️</span><span>Excluir</span>
    </button>
    <button class="context-menu-cancel" onclick="closeTxMenu()">Cancelar</button>
  `;

  const backdrop = document.createElement('div');
  backdrop.id = 'tx-context-backdrop';
  backdrop.className = 'context-backdrop';
  backdrop.onclick = closeTxMenu;

  document.body.appendChild(backdrop);
  document.body.appendChild(menu);
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
}

// ===== GASTOS FIXOS =====

function getFixoStatusKey(fixoId, month, year) {
  return `${fixoId}_${year}_${month}`;
}

function getFixoStatus(fixoId, month, year) {
  const data = loadData();
  const key = getFixoStatusKey(fixoId, month, year);
  return data.fixos_status[key] || 'pendente';
}

function setFixoStatus(fixoId, month, year, status) {
  const data = loadData();
  const key = getFixoStatusKey(fixoId, month, year);
  data.fixos_status[key] = status;
  saveData('fixos_status', data.fixos_status);
}

function confirmarPagamento(fixoId) {
  const data = loadData();
  const fixo = data.fixos.find(f => f.id === fixoId);
  if (!fixo) return;
  const month = state.currentMonth;
  const year = state.currentYear;

  const today = new Date();
  const todayDay = today.getDate();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
  const isPaidLate = isCurrentMonth && todayDay > fixo.dia;

  // Use today as payment date if late, otherwise use vencimento day
  const payDay = isPaidLate ? todayDay : fixo.dia;
  const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(payDay).padStart(2,'0')}`;

  const desc = isPaidLate ? `${fixo.nome} (pago em atraso)` : fixo.nome;

  data.transactions.push({
    id: 'tx_fixo_' + fixoId + '_' + year + '_' + month,
    desc, valor: fixo.valor, cat: fixo.cat, conta: fixo.conta,
    tipo: 'expense', data: dateStr,
    month, year, parcelas: 1, parcelaAtual: 1, isRecurrent: false, isFixo: true,
    paidLate: isPaidLate,
  });
  saveData('transactions', data.transactions);
  setFixoStatus(fixoId, month, year, isPaidLate ? 'pago_atrasado' : 'pago');
  toast(isPaidLate ? 'Registrado como pago em atraso' : 'Pagamento confirmado!');
  renderPage();
}

function deleteFixo(id) {
  const data = loadData();
  data.fixos = data.fixos.filter(f => f.id !== id);
  saveData('fixos', data.fixos);
  renderPage();
  toast('Gasto fixo removido');
}

function saveFixo() {
  const nome = document.getElementById('fx-nome').value.trim();
  const valor = getCurrencyValue(document.getElementById('fx-valor'));
  const cat = document.getElementById('fx-cat').value;
  const conta = document.getElementById('fx-conta').value;
  const dia = parseInt(document.getElementById('fx-dia').value) || 0;
  const tipoFixo = document.getElementById('fx-tipo-val').value || 'recorrente';
  if (!nome || valor <= 0 || !dia) { toast('Preencha todos os campos'); return; }

  const data = loadData();
  const fixo = { id: 'fx_' + Date.now(), nome, valor, cat, conta, dia, tipo: tipoFixo };

  if (tipoFixo === 'parcelado') {
    const totalParcelas = parseInt(document.getElementById('fx-total-parcelas').value) || 0;
    const parcelaAtual = parseInt(document.getElementById('fx-parcela-atual').value) || 1;
    if (!totalParcelas || totalParcelas < parcelaAtual) { toast('Verifique as parcelas'); return; }
    fixo.totalParcelas = totalParcelas;
    fixo.parcelaAtual = parcelaAtual;
    // Calculate start month/year based on current month and parcelaAtual
    let startMonth = state.currentMonth - (parcelaAtual - 1);
    let startYear = state.currentYear;
    while (startMonth < 0) { startMonth += 12; startYear--; }
    fixo.startMonth = startMonth;
    fixo.startYear = startYear;
  }

  if (tipoFixo === 'unica') {
    fixo.addedMonth = state.currentMonth;
    fixo.addedYear = state.currentYear;
  }
  data.fixos.push(fixo);
  saveData('fixos', data.fixos);
  hideModal('modal-add-fixo');
  toast('Gasto fixo adicionado!');
  renderPage();
  checkFixosNotifications();
}

function renderFixos() {
  const data = loadData();
  const today = new Date();
  const todayDay = today.getDate();
  const month = state.currentMonth;
  const year = state.currentYear;
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  // Compute status for each fixo
  const withStatus = data.fixos.map(f => {
    // Check if unica: only show in the month it was added
    if (f.tipo === 'unica') {
      if (f.addedMonth !== undefined && (month !== f.addedMonth || year !== f.addedYear)) return null;
    }
    // Check if parcelado fixo is finished or not yet started
    if (f.tipo === 'parcelado') {
      const parcelaIndex = (year - f.startYear) * 12 + (month - f.startMonth);
      const parcelaNum = parcelaIndex + 1;
      if (parcelaNum < 1 || parcelaNum > f.totalParcelas) return null; // not active this month
      f = { ...f, parcelaAtual: parcelaNum };
    }
    let status = getFixoStatus(f.id, month, year);
    // Auto-detect atrasado for current month
    if (status === 'pendente' && isCurrentMonth && todayDay > f.dia) {
      status = 'atrasado';
    }
    return { ...f, status };
  }).filter(Boolean);

  const totalFixos = data.fixos.reduce((s, f) => s + f.valor, 0);
  const totalPago = withStatus.filter(f => f.status === 'pago').reduce((s, f) => s + f.valor, 0);
  const totalPendente = withStatus.filter(f => f.status !== 'pago').reduce((s, f) => s + f.valor, 0);

  const statusLabel = { pendente: 'A vencer', atrasado: 'Atrasado', pago: 'Pago', pago_atrasado: 'Pago em atraso' };
  const statusColor = { pendente: 'var(--amber)', atrasado: 'var(--red)', pago: 'var(--green)', pago_atrasado: 'var(--blue)' };
  const statusBg = { pendente: 'var(--amber-dim)', atrasado: 'var(--red-dim)', pago: 'var(--green-dim)', pago_atrasado: 'var(--blue-dim)' };

  // Sort: atrasado first, then pendente by dia, then pago
  const order = { atrasado: 0, pendente: 1, pago_atrasado: 2, pago: 3 };
  withStatus.sort((a, b) => order[a.status] - order[b.status] || a.dia - b.dia);

  return `
    <div class="mini-cards" style="grid-template-columns:1fr 1fr 1fr">
      <div class="mini-card"><div class="mini-card-label">Total fixos</div><div class="mini-card-value" style="font-size:14px">${fmt(totalFixos)}</div></div>
      <div class="mini-card"><div class="mini-card-label">Pago</div><div class="mini-card-value income" style="font-size:14px">${fmt(totalPago)}</div></div>
      <div class="mini-card"><div class="mini-card-label">Pendente</div><div class="mini-card-value expense" style="font-size:14px">${fmt(totalPendente)}</div></div>
    </div>

    ${withStatus.length === 0 ? `
      <div class="empty-state"><div class="empty-state-icon">📋</div>Nenhum gasto fixo cadastrado</div>
    ` : withStatus.map(f => {
      const cat = data.categories.find(c => c.id === f.cat);
      const card = data.cards.find(c => c.id === f.conta);
      const daysUntil = isCurrentMonth ? f.dia - todayDay : null;
      let alertMsg = '';
      if (f.status === 'pendente' && daysUntil !== null) {
        if (daysUntil === 0) alertMsg = `<div style="font-size:11px;color:var(--red);margin-top:4px">⚠ Vence hoje!</div>`;
        else if (daysUntil > 0 && daysUntil <= 3) alertMsg = `<div style="font-size:11px;color:var(--amber);margin-top:4px">⏰ Vence em ${daysUntil} dia${daysUntil > 1 ? 's' : ''}</div>`;
      }
      if (f.status === 'atrasado') alertMsg = `<div style="font-size:11px;color:var(--red);margin-top:4px">⚠ Pagamento atrasado!</div>`;

      return `<div class="fixo-card"
        oncontextmenu="showFixoMenu(event,'${f.id}');return false;"
        ontouchstart="startLongPress(event,'${f.id}','fixo')"
        ontouchend="cancelLongPress()"
        ontouchmove="cancelLongPress()">
        <div class="fixo-card-left">
          <div class="tx-icon" style="background:${cat ? 'var(--red-dim)' : 'var(--bg3)'};width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${cat ? cat.icon : '📦'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.nome}</div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px">
              Dia ${f.dia} · ${card ? card.nome : '—'}
              ${f.tipo === 'parcelado' ? `<span class="tx-parcela-badge" style="margin-left:4px">${f.parcelaAtual}/${f.totalParcelas}x</span>` : ''}
              ${f.tipo === 'recorrente' ? `<span class="recorrente-badge" style="margin-left:4px">🔁 Mensal</span>` : ''}
              ${f.tipo === 'unica' ? `<span style="font-size:10px;color:var(--text3);background:var(--bg4);padding:1px 5px;border-radius:4px;margin-left:4px">Única</span>` : ''}
            </div>
            ${alertMsg}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <div style="font-size:15px;font-weight:500;font-family:var(--mono);color:var(--red)">-${fmt(f.valor)}</div>
          <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${statusBg[f.status]};color:${statusColor[f.status]};font-weight:500">${statusLabel[f.status]}</span>
          ${(f.status !== 'pago' && f.status !== 'pago_atrasado') ? `<button class="btn-confirm-fixo" onclick="confirmarPagamento('${f.id}')">✓ Pago</button>` : `<button class="btn-confirm-fixo" style="color:var(--text3);border-color:var(--bg4)" onclick="desfazerPagamento('${f.id}')">Desfazer</button>`}
        </div>
        <button onclick="deleteFixo('${f.id}')" style="position:absolute;top:10px;right:10px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:4px">×</button>
      </div>`;
    }).join('')}

    <button class="goal-add-btn" style="margin-top:12px" onclick="openAddFixo()">+ Novo gasto fixo</button>
  `;
}

function desfazerPagamento(fixoId) {
  const data = loadData();
  const today = new Date();
  const isCurrentMonth = state.currentMonth === today.getMonth() && state.currentYear === today.getFullYear();
  const fixo = data.fixos.find(f => f.id === fixoId);
  // Remove transaction
  data.transactions = data.transactions.filter(t => t.id !== `tx_fixo_${fixoId}_${state.currentYear}_${state.currentMonth}`);
  saveData('transactions', data.transactions);
  // If past due day in current month, revert to atrasado instead of pendente
  const revertStatus = (isCurrentMonth && fixo && today.getDate() > fixo.dia) ? 'atrasado' : 'pendente';
  setFixoStatus(fixoId, state.currentMonth, state.currentYear, revertStatus);
  toast('Pagamento desfeito');
  renderPage();
}

function setFixoTipo(tipo) {
  document.getElementById('fx-tipo-unica').classList.toggle('active', tipo === 'unica');
  document.getElementById('fx-tipo-recorrente').classList.toggle('active', tipo === 'recorrente');
  document.getElementById('fx-tipo-parcelado').classList.toggle('active', tipo === 'parcelado');
  document.getElementById('fx-tipo-val').value = tipo;
  document.getElementById('fx-parcelas-group').style.display = tipo === 'parcelado' ? 'block' : 'none';
}

function openAddFixo() {
  const data = loadData();
  const catSel = document.getElementById('fx-cat');
  catSel.innerHTML = data.categories.filter(c => c.tipo === 'expense' || c.tipo === 'both')
    .map(c => `<option value="${c.id}">${c.icon} ${c.nome}</option>`).join('');
  const contaSel = document.getElementById('fx-conta');
  contaSel.innerHTML = data.cards.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  const fxValor = document.getElementById('fx-valor');
  fxValor.value = ''; fxValor.dataset.cents = '';
  setupCurrencyInput(fxValor);
  document.getElementById('fx-nome').value = '';
  document.getElementById('fx-dia').value = '';
  document.getElementById('fx-parcela-atual').value = '';
  document.getElementById('fx-total-parcelas').value = '';
  document.getElementById('fx-parcela-info').textContent = '';
  setFixoTipo('recorrente');
  state.editingFixoId = null;
  document.getElementById('fx-save-btn').textContent = 'Salvar';
  document.getElementById('modal-add-fixo-title').textContent = 'Novo Gasto Fixo';

  // Live parcela info
  const updateParcelaFixoInfo = () => {
    const atual = parseInt(document.getElementById('fx-parcela-atual').value) || 0;
    const total = parseInt(document.getElementById('fx-total-parcelas').value) || 0;
    if (atual && total && total >= atual) {
      const restantes = total - atual;
      document.getElementById('fx-parcela-info').textContent =
        `Parcela ${atual} de ${total} · faltam ${restantes} parcela${restantes !== 1 ? 's' : ''} após este mês`;
    } else {
      document.getElementById('fx-parcela-info').textContent = '';
    }
  };
  document.getElementById('fx-parcela-atual').oninput = updateParcelaFixoInfo;
  document.getElementById('fx-total-parcelas').oninput = updateParcelaFixoInfo;

  showModal('modal-add-fixo');
}

// ===== NOTIFICATIONS =====
function checkFixosNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'denied') return;

  const run = () => {
    const data = loadData();
    const today = new Date();
    const todayDay = today.getDate();
    const month = today.getMonth();
    const year = today.getFullYear();

    data.fixos.forEach(f => {
      const status = getFixoStatus(f.id, month, year);
      if (status === 'pago') return;
      const diff = f.dia - todayDay;
      let msg = null;
      if (diff === 0) msg = `"${f.nome}" vence hoje! (${fmt(f.valor)})`;
      else if (diff > 0 && diff <= 3) msg = `"${f.nome}" vence em ${diff} dia${diff > 1 ? 's' : ''} (${fmt(f.valor)})`;
      else if (diff < 0) msg = `"${f.nome}" está atrasado! (${fmt(f.valor)})`;
      if (msg) {
        new Notification('💸 Meu Bolso — Gasto Fixo', { body: msg, icon: 'icon-192.png' });
      }
    });
  };

  if (Notification.permission === 'granted') { run(); }
  else {
    Notification.requestPermission().then(p => { if (p === 'granted') run(); });
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
// Setup currency inputs as soon as DOM is available
if (typeof document !== 'undefined') {
  setTimeout(setupAllCurrencyInputs, 0);
}
applyRecurrents();
updateHeader();
renderPage();
