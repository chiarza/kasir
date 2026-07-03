/* ============================================================
   APLIKASI KASIR - app.js
   Semua data disimpan di localStorage browser, jadi data akan
   tetap ada walau aplikasi ditutup dan dibuka lagi besok.
   ============================================================ */

const STORAGE_KEYS = {
  MENU: 'kasir_menu',
  TRANSAKSI: 'kasir_transaksi',
  PENGELUARAN: 'kasir_pengeluaran'
};

const DEFAULT_MENU = {
  matcha: [
    { id: 'm1', name: 'Matcha Latte', price: 18000 },
    { id: 'm2', name: 'Matcha Latte Creamy', price: 20000 },
    { id: 'm3', name: 'Iced Matcha', price: 18000 },
    { id: 'm4', name: 'Matcha Frappe', price: 22000 }
  ],
  kopi: [
    { id: 'k1', name: 'Kopi Susu', price: 15000 },
    { id: 'k2', name: 'Americano', price: 15000 },
    { id: 'k3', name: 'Cappuccino', price: 18000 },
    { id: 'k4', name: 'Kopi Hitam', price: 10000 }
  ],
  refreshment: [
    { id: 'r1', name: 'Lemon Tea', price: 12000 },
    { id: 'r2', name: 'Air Mineral', price: 5000 },
    { id: 'r3', name: 'Soda Gembira', price: 15000 },
    { id: 'r4', name: 'Fresh Milk', price: 15000 }
  ]
};

/* ---------- State ---------- */
let menuData = loadJSON(STORAGE_KEYS.MENU, DEFAULT_MENU);
let transaksiData = loadJSON(STORAGE_KEYS.TRANSAKSI, []);
let pengeluaranData = loadJSON(STORAGE_KEYS.PENGELUARAN, []);

let currentCategory = 'matcha';
let cart = {}; // { menuId: {name, price, qty} }

/* ---------- Storage helpers ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function saveMenu() { saveJSON(STORAGE_KEYS.MENU, menuData); }
function saveTransaksi() { saveJSON(STORAGE_KEYS.TRANSAKSI, transaksiData); }
function savePengeluaran() { saveJSON(STORAGE_KEYS.PENGELUARAN, pengeluaranData); }

/* ---------- Utils ---------- */
function formatRupiah(num) {
  return 'Rp' + Number(num || 0).toLocaleString('id-ID');
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getWeekRange(dateObj) {
  const d = new Date(dateObj);
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Senin=1 ... Minggu=7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toStr = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  return { start: toStr(monday), end: toStr(sunday) };
}

function monthStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function sumTransaksi(filterFn) {
  return transaksiData.filter(filterFn).reduce((s, t) => s + t.total, 0);
}

function sumPengeluaran(filterFn) {
  return pengeluaranData.filter(filterFn).reduce((s, p) => s + p.amount, 0);
}

/* ============================================================
   NAVIGASI BOTTOM NAV
   ============================================================ */
const navButtons = document.querySelectorAll('.nav-btn');
const screens = {
  laporan: document.getElementById('screen-laporan'),
  kasir: document.getElementById('screen-kasir'),
  pengeluaran: document.getElementById('screen-pengeluaran')
};

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.screen;
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[target].classList.add('active');

    if (target === 'laporan') renderLaporan();
    if (target === 'pengeluaran') renderPengeluaran();
    if (target === 'kasir') renderKasirHeader();
  });
});

/* ============================================================
   SCREEN KASIR (TENGAH)
   ============================================================ */
const menuGrid = document.getElementById('menu-grid');
const catTabs = document.querySelectorAll('.cat-tab');
const totalBar = document.getElementById('total-bar');
const totalBelanjaEl = document.getElementById('total-belanja');
const pendapatanHariIniEl = document.getElementById('pendapatan-hari-ini');

catTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    currentCategory = tab.dataset.cat;
    catTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderMenuGrid();
  });
});

function renderMenuGrid() {
  const items = menuData[currentCategory] || [];
  menuGrid.innerHTML = '';

  if (items.length === 0) {
    menuGrid.innerHTML = '<p class="empty-note">Belum ada menu di kategori ini. Gunakan tombol "Kelola Menu".</p>';
    return;
  }

  items.forEach(item => {
    const qty = cart[item.id] ? cart[item.id].qty : 0;
    const card = document.createElement('div');
    card.className = 'menu-card' + (qty > 0 ? ' has-qty' : '');
    card.innerHTML = `
      <div class="menu-name">${escapeHtml(item.name)}</div>
      <div class="menu-price">${formatRupiah(item.price)}</div>
      <div class="qty-control">
        <button class="qty-minus" data-id="${item.id}">-</button>
        <span class="qty-val">${qty}</span>
        <button class="qty-plus" data-id="${item.id}">+</button>
      </div>
    `;
    menuGrid.appendChild(card);
  });

  menuGrid.querySelectorAll('.qty-plus').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.id, 1)));
  menuGrid.querySelectorAll('.qty-minus').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.id, -1)));
}

function findMenuItem(id) {
  for (const cat in menuData) {
    const found = menuData[cat].find(m => m.id === id);
    if (found) return found;
  }
  return null;
}

function changeQty(id, delta) {
  const item = findMenuItem(id);
  if (!item) return;

  if (!cart[id]) cart[id] = { name: item.name, price: item.price, qty: 0 };
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];

  renderMenuGrid();
  updateTotalBar();
}

function updateTotalBar() {
  const total = Object.values(cart).reduce((s, c) => s + c.price * c.qty, 0);
  if (total > 0) {
    totalBar.classList.remove('hidden');
    totalBelanjaEl.textContent = formatRupiah(total);
  } else {
    totalBar.classList.add('hidden');
  }
}

function renderKasirHeader() {
  const total = sumTransaksi(t => t.date === todayStr());
  pendapatanHariIniEl.textContent = formatRupiah(total);
}

/* ---------- Modal Pembayaran ---------- */
const modalBayar = document.getElementById('modal-bayar');
const payTotalEl = document.getElementById('pay-total');
const inputUangDiterima = document.getElementById('input-uang-diterima');
const payKembalianEl = document.getElementById('pay-kembalian');
const btnBatalBayar = document.getElementById('btn-batal-bayar');
const btnSelesaiBayar = document.getElementById('btn-selesai-bayar');

totalBar.addEventListener('click', () => {
  const total = Object.values(cart).reduce((s, c) => s + c.price * c.qty, 0);
  if (total <= 0) return;
  payTotalEl.textContent = formatRupiah(total);
  inputUangDiterima.value = '';
  payKembalianEl.textContent = formatRupiah(0);
  modalBayar.classList.remove('hidden');
  inputUangDiterima.focus();
});

inputUangDiterima.addEventListener('input', () => {
  const total = Object.values(cart).reduce((s, c) => s + c.price * c.qty, 0);
  const diterima = Number(inputUangDiterima.value) || 0;
  const kembali = diterima - total;
  payKembalianEl.textContent = formatRupiah(kembali > 0 ? kembali : 0);
});

btnBatalBayar.addEventListener('click', () => modalBayar.classList.add('hidden'));

btnSelesaiBayar.addEventListener('click', () => {
  const total = Object.values(cart).reduce((s, c) => s + c.price * c.qty, 0);
  if (total <= 0) return;

  const diterima = Number(inputUangDiterima.value) || 0;

  const transaksi = {
    id: 'trx_' + Date.now(),
    date: todayStr(),
    timestamp: Date.now(),
    items: Object.entries(cart).map(([id, c]) => ({ id, name: c.name, price: c.price, qty: c.qty })),
    total: total,
    diterima: diterima,
    kembalian: diterima - total
  };

  transaksiData.push(transaksi);
  saveTransaksi();

  cart = {};
  modalBayar.classList.add('hidden');
  renderMenuGrid();
  updateTotalBar();
  renderKasirHeader();
});

/* ---------- Modal Kelola Menu ---------- */
const modalMenu = document.getElementById('modal-menu');
const btnKelolaMenu = document.getElementById('btn-kelola-menu');
const btnTutupMenu = document.getElementById('btn-tutup-menu');
const formTambahMenu = document.getElementById('form-tambah-menu');
const kelolaMenuList = document.getElementById('kelola-menu-list');

btnKelolaMenu.addEventListener('click', () => {
  renderKelolaMenuList();
  modalMenu.classList.remove('hidden');
});

btnTutupMenu.addEventListener('click', () => modalMenu.classList.add('hidden'));

formTambahMenu.addEventListener('submit', (e) => {
  e.preventDefault();
  const cat = document.getElementById('input-menu-cat').value;
  const nama = document.getElementById('input-menu-nama').value.trim();
  const harga = Number(document.getElementById('input-menu-harga').value);
  if (!nama || harga <= 0) return;

  const newItem = { id: 'menu_' + Date.now(), name: nama, price: harga };
  if (!menuData[cat]) menuData[cat] = [];
  menuData[cat].push(newItem);
  saveMenu();

  formTambahMenu.reset();
  renderKelolaMenuList();
  renderMenuGrid();
});

function renderKelolaMenuList() {
  kelolaMenuList.innerHTML = '';
  const catLabels = { matcha: 'Matcha', kopi: 'Kopi', refreshment: 'Refreshment' };

  Object.keys(menuData).forEach(cat => {
    menuData[cat].forEach(item => {
      const row = document.createElement('div');
      row.className = 'kelola-menu-item';
      row.innerHTML = `
        <div class="kmi-info">
          <div class="kmi-cat">${catLabels[cat] || cat}</div>
          <div>${escapeHtml(item.name)} — ${formatRupiah(item.price)}</div>
        </div>
        <button data-cat="${cat}" data-id="${item.id}">Hapus</button>
      `;
      kelolaMenuList.appendChild(row);
    });
  });

  kelolaMenuList.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      const cat = b.dataset.cat;
      const id = b.dataset.id;
      menuData[cat] = menuData[cat].filter(m => m.id !== id);
      delete cart[id];
      saveMenu();
      renderKelolaMenuList();
      renderMenuGrid();
      updateTotalBar();
    });
  });
}

/* ============================================================
   SCREEN PENGELUARAN (KANAN)
   ============================================================ */
const formPengeluaran = document.getElementById('form-pengeluaran');
const pengeluaranList = document.getElementById('pengeluaran-list');
const pengPendapatanEl = document.getElementById('peng-pendapatan');
const pengPengeluaranEl = document.getElementById('peng-pengeluaran');
const pengBersihEl = document.getElementById('peng-bersih');

formPengeluaran.addEventListener('submit', (e) => {
  e.preventDefault();
  const desc = document.getElementById('input-desc').value.trim();
  const amount = Number(document.getElementById('input-amount').value);
  if (!desc || amount <= 0) return;

  pengeluaranData.push({
    id: 'exp_' + Date.now(),
    date: todayStr(),
    desc: desc,
    amount: amount,
    timestamp: Date.now()
  });
  savePengeluaran();

  formPengeluaran.reset();
  renderPengeluaran();
});

function renderPengeluaran() {
  const today = todayStr();
  const pendapatanHariIni = sumTransaksi(t => t.date === today);
  const pengeluaranHariIni = sumPengeluaran(p => p.date === today);

  pengPendapatanEl.textContent = formatRupiah(pendapatanHariIni);
  pengPengeluaranEl.textContent = formatRupiah(pengeluaranHariIni);
  pengBersihEl.textContent = formatRupiah(pendapatanHariIni - pengeluaranHariIni);

  const todayExpenses = pengeluaranData
    .filter(p => p.date === today)
    .sort((a, b) => b.timestamp - a.timestamp);

  pengeluaranList.innerHTML = '';
  if (todayExpenses.length === 0) {
    pengeluaranList.innerHTML = '<p class="empty-note">Belum ada pengeluaran hari ini.</p>';
    return;
  }

  todayExpenses.forEach(exp => {
    const row = document.createElement('div');
    row.className = 'expense-item';
    row.innerHTML = `
      <div>
        <div class="exp-desc">${escapeHtml(exp.desc)}</div>
        <div class="exp-date">${exp.date}</div>
      </div>
      <div style="display:flex; align-items:center;">
        <span class="exp-amount">-${formatRupiah(exp.amount)}</span>
        <button class="exp-del" data-id="${exp.id}">✕</button>
      </div>
    `;
    pengeluaranList.appendChild(row);
  });

  pengeluaranList.querySelectorAll('.exp-del').forEach(b => {
    b.addEventListener('click', () => {
      pengeluaranData = pengeluaranData.filter(p => p.id !== b.dataset.id);
      savePengeluaran();
      renderPengeluaran();
    });
  });
}

/* ============================================================
   SCREEN LAPORAN (KIRI)
   ============================================================ */
function renderLaporan() {
  const today = todayStr();
  const week = getWeekRange(new Date());
  const month = monthStr();

  // Hari ini
  const pHari = sumTransaksi(t => t.date === today);
  const eHari = sumPengeluaran(p => p.date === today);
  document.getElementById('rep-hari-pendapatan').textContent = formatRupiah(pHari);
  document.getElementById('rep-hari-pengeluaran').textContent = formatRupiah(eHari);
  document.getElementById('rep-hari-sisa').textContent = formatRupiah(pHari - eHari);

  // Minggu ini
  const pMinggu = sumTransaksi(t => t.date >= week.start && t.date <= week.end);
  const eMinggu = sumPengeluaran(p => p.date >= week.start && p.date <= week.end);
  document.getElementById('rep-minggu-pendapatan').textContent = formatRupiah(pMinggu);
  document.getElementById('rep-minggu-pengeluaran').textContent = formatRupiah(eMinggu);
  document.getElementById('rep-minggu-sisa').textContent = formatRupiah(pMinggu - eMinggu);

  // Bulan ini
  const pBulan = sumTransaksi(t => t.date.startsWith(month));
  const eBulan = sumPengeluaran(p => p.date.startsWith(month));
  document.getElementById('rep-bulan-pendapatan').textContent = formatRupiah(pBulan);
  document.getElementById('rep-bulan-pengeluaran').textContent = formatRupiah(eBulan);
  document.getElementById('rep-bulan-sisa').textContent = formatRupiah(pBulan - eBulan);

  renderRiwayat();
}

function renderRiwayat() {
  const riwayatList = document.getElementById('riwayat-list');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  // Kelompokkan transaksi per tanggal
  const byDate = {};
  transaksiData
    .filter(t => t.date >= sevenDaysAgoStr)
    .forEach(t => {
      byDate[t.date] = (byDate[t.date] || 0) + t.total;
    });

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  riwayatList.innerHTML = '';
  if (dates.length === 0) {
    riwayatList.innerHTML = '<p class="empty-note">Belum ada transaksi.</p>';
    return;
  }

  dates.forEach(date => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <span class="hi-date">${date}</span>
      <span class="hi-total">${formatRupiah(byDate[date])}</span>
    `;
    riwayatList.appendChild(row);
  });
}

/* ---------- Reset semua data ---------- */
document.getElementById('btn-reset-data').addEventListener('click', () => {
  const ok = confirm('Yakin ingin menghapus SEMUA data transaksi, pengeluaran, dan menu kustom? Tindakan ini tidak bisa dibatalkan.');
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEYS.TRANSAKSI);
  localStorage.removeItem(STORAGE_KEYS.PENGELUARAN);
  localStorage.removeItem(STORAGE_KEYS.MENU);
  location.reload();
});

/* ---------- Helper anti XSS sederhana ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  renderMenuGrid();
  updateTotalBar();
  renderKasirHeader();
}

init();