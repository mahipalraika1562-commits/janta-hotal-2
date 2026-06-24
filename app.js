import { auth, db, HOTEL_NAME, HOTEL_GSTIN, HOTEL_PHONE, HOTEL_ADDRESS } from './firebase-config.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== GLOBALS =====
let currentUser = null;
let hotelId = null;
const pageNames = {
  dashboard:'Dashboard', receipt:'Receipt Voucher', payment:'Payment Voucher',
  journal:'Journal Entry', sales:'Sales Invoice', purchase:'Purchase Entry',
  ledger:'Ledger', daybook:'Day Book', cashbook:'Cash Book',
  trialbalance:'Trial Balance', pandl:'P&L Statement', balancesheet:'Balance Sheet',
  gst:'GST Report', accounts:'Accounts Master', rooms:'Room Management',
  inventory:'Inventory', settings:'Settings'
};

// ===== AUTH =====
window.loginUser = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const errDiv = document.getElementById('loginError');
  errDiv.style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch(e) {
    errDiv.textContent = 'Login failed: ' + (e.code === 'auth/invalid-credential' ? 'Wrong email or password' : e.message);
    errDiv.style.display = 'flex';
  }
};

window.logoutUser = async function() {
  await signOut(auth);
};

// Enter key on login
document.getElementById('loginPassword').addEventListener('keydown', e => {
  if(e.key === 'Enter') window.loginUser();
});

onAuthStateChanged(auth, async user => {
  if(user) {
    currentUser = user;
    hotelId = user.uid;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'flex';
    initApp();
    await ensureDemoData();
  } else {
    currentUser = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
  }
});

// ===== INIT =====
function initApp() {
  const today = new Date();
  document.getElementById('topbarDate').textContent =
    today.toLocaleDateString('hi-IN', {day:'2-digit', month:'long', year:'numeric'});
  showPage('dashboard', document.querySelector('.nav-item.active'));
}

// ===== SIDEBAR =====
window.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
};

// ===== PAGE NAVIGATION =====
window.showPage = async function(id, el) {
  document.getElementById('topbarTitle').textContent = pageNames[id] || id;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if(el) el.classList.add('active');
  if(window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  }
  const content = document.getElementById('mainContent');
  content.innerHTML = `<div class="loading"><div class="spinner"></div> Load ho raha hai...</div>`;
  window.scrollTo(0,0);

  const pages = {
    dashboard: renderDashboard, receipt: renderReceipt, payment: renderPayment,
    journal: renderJournal, sales: renderSales, purchase: renderPurchase,
    ledger: renderLedger, daybook: renderDaybook, cashbook: renderCashbook,
    trialbalance: renderTrialBalance, pandl: renderPandL, balancesheet: renderBalanceSheet,
    gst: renderGST, accounts: renderAccounts, rooms: renderRooms,
    inventory: renderInventory, settings: renderSettings
  };
  if(pages[id]) await pages[id](content);
};

// ===== TOAST =====
function toast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => t.className = 'toast', 2800);
}
window.toast = toast;

// ===== FIRESTORE HELPERS =====
function col(name) { return collection(db, `hotels/${hotelId}/${name}`); }

async function getVoucherNo(prefix) {
  const snap = await getDocs(query(col('vouchers'), where('prefix','==',prefix), orderBy('createdAt','desc'), limit(1)));
  if(snap.empty) return `${prefix}-001`;
  const last = snap.docs[0].data().voucherNo;
  const num = parseInt(last.split('-').pop()) + 1;
  return `${prefix}-${String(num).padStart(3,'0')}`;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmt(n) { return Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2}); }
function fmtShort(n) { return Number(n||0).toLocaleString('en-IN'); }

// ===== DEMO DATA SEED =====
async function ensureDemoData() {
  const settingDoc = doc(db, `hotels/${hotelId}/settings/main`);
  const snap = await getDoc(settingDoc);
  if(!snap.exists()) {
    await setDoc(settingDoc, {
      hotelName: 'Janta Hotel', gstin: HOTEL_GSTIN,
      phone: HOTEL_PHONE, address: HOTEL_ADDRESS,
      fyStart: 'April', currency: 'INR', createdAt: serverTimestamp()
    });
    // Seed accounts
    const accounts = [
      {name:'Cash in Hand', group:'Cash', opening:10000, type:'Dr'},
      {name:'Bank - SBI', group:'Bank', opening:150000, type:'Dr'},
      {name:'Room Rent Income', group:'Income', opening:0, type:'Cr'},
      {name:'Food Income', group:'Income', opening:0, type:'Cr'},
      {name:'Banquet Income', group:'Income', opening:0, type:'Cr'},
      {name:'Salary Expense', group:'Expense', opening:0, type:'Dr'},
      {name:'Electricity Expense', group:'Expense', opening:0, type:'Dr'},
      {name:'Purchase - Food', group:'Expense', opening:0, type:'Dr'},
      {name:'Accounts Receivable', group:'Current Asset', opening:0, type:'Dr'},
      {name:'Accounts Payable', group:'Current Liability', opening:0, type:'Cr'},
    ];
    for(const a of accounts) {
      await addDoc(col('accounts'), {...a, createdAt: serverTimestamp()});
    }
    // Seed rooms
    const rooms = [
      {no:'101', type:'Single', rate:1200, weekendRate:1500, status:'available', gst:12},
      {no:'102', type:'Double', rate:1800, weekendRate:2200, status:'occupied', guest:'Ramesh Kumar', gst:12},
      {no:'103', type:'Single', rate:1200, weekendRate:1500, status:'available', gst:12},
      {no:'201', type:'Suite', rate:4500, weekendRate:5500, status:'occupied', guest:'ABC Corp', gst:18},
      {no:'202', type:'Double', rate:1800, weekendRate:2200, status:'cleaning', gst:12},
      {no:'301', type:'Single', rate:1200, weekendRate:1500, status:'available', gst:12},
    ];
    for(const r of rooms) await addDoc(col('rooms'), {...r, createdAt: serverTimestamp()});
    // Seed inventory
    const items = [
      {name:'Rice', category:'Food', stock:45, unit:'Kg', minLevel:10},
      {name:'Cooking Oil', category:'Food', stock:5, unit:'Litre', minLevel:10},
      {name:'Bed Sheets', category:'Linen', stock:80, unit:'Pcs', minLevel:20},
      {name:'Soap', category:'Toiletry', stock:120, unit:'Pcs', minLevel:50},
      {name:'Towels', category:'Linen', stock:12, unit:'Pcs', minLevel:20},
    ];
    for(const i of items) await addDoc(col('inventory'), {...i, createdAt: serverTimestamp()});
    // Seed sample vouchers
    const voucherSeed = [
      {prefix:'RV', voucherNo:'RV-001', type:'receipt', party:'Ramesh Kumar', amount:2500, ledger:'Room Rent Income', mode:'Cash', narration:'Room 102 rent', date: todayStr()},
      {prefix:'PV', voucherNo:'PV-001', type:'payment', party:'Vegetable Supplier', amount:1200, ledger:'Purchase - Food', mode:'Cash', narration:'Sabzi khareed', date: todayStr()},
      {prefix:'INV', voucherNo:'INV-001', type:'sales', party:'ABC Corp', amount:15000, gst:18, narration:'Banquet Hall', date: todayStr()},
    ];
    for(const v of voucherSeed) await addDoc(col('vouchers'), {...v, createdAt: serverTimestamp()});
    toast('Demo data load ho gaya! 🎉');
  }
}

// ===== DASHBOARD =====
async function renderDashboard(el) {
  const [vSnap, rSnap] = await Promise.all([
    getDocs(query(col('vouchers'), orderBy('createdAt','desc'), limit(20))),
    getDocs(col('rooms'))
  ]);
  const vouchers = vSnap.docs.map(d => ({id:d.id,...d.data()}));
  const rooms = rSnap.docs.map(d => ({id:d.id,...d.data()}));

  const todayIncome = vouchers.filter(v=>v.date===todayStr()&&v.type==='receipt').reduce((s,v)=>s+Number(v.amount||0),0);
  const occupied = rooms.filter(r=>r.status==='occupied').length;
  const todayBills = vouchers.filter(v=>v.date===todayStr()).length;
  const pending = vouchers.filter(v=>v.status==='pending').reduce((s,v)=>s+Number(v.amount||0),0);

  el.innerHTML = `
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon" style="background:#e8f4fd"><i class="ti ti-cash" style="color:var(--info)"></i></div>
      <div class="stat-label">Aaj ki Income</div>
      <div class="stat-value">₹${fmtShort(todayIncome)}</div>
      <div class="stat-change up"><i class="ti ti-trending-up"></i> Aaj ke transactions</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#fef9e7"><i class="ti ti-door" style="color:var(--accent)"></i></div>
      <div class="stat-label">Rooms Occupied</div>
      <div class="stat-value">${occupied} / ${rooms.length}</div>
      <div class="stat-change up"><i class="ti ti-percentage"></i> ${rooms.length?Math.round(occupied/rooms.length*100):0}% Occupancy</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#eafaf1"><i class="ti ti-receipt" style="color:var(--success)"></i></div>
      <div class="stat-label">Aaj ke Vouchers</div>
      <div class="stat-value">${todayBills}</div>
      <div class="stat-change"><i class="ti ti-calendar"></i> Today's entries</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#fdedec"><i class="ti ti-alert-circle" style="color:var(--danger)"></i></div>
      <div class="stat-label">Pending (Receivable)</div>
      <div class="stat-value">₹${fmtShort(pending)}</div>
      <div class="stat-change down"><i class="ti ti-clock"></i> Baki amount</div>
    </div>
  </div>

  <div class="quick-actions">
    <div class="qa-btn" onclick="showPage('receipt',null)"><i class="ti ti-receipt"></i><span>Receipt</span></div>
    <div class="qa-btn" onclick="showPage('payment',null)"><i class="ti ti-cash"></i><span>Payment</span></div>
    <div class="qa-btn" onclick="showPage('sales',null)"><i class="ti ti-file-invoice"></i><span>Invoice</span></div>
    <div class="qa-btn" onclick="showPage('journal',null)"><i class="ti ti-notebook"></i><span>Journal</span></div>
    <div class="qa-btn" onclick="showPage('daybook',null)"><i class="ti ti-calendar"></i><span>Day Book</span></div>
    <div class="qa-btn" onclick="showPage('pandl',null)"><i class="ti ti-chart-line"></i><span>P&L</span></div>
    <div class="qa-btn" onclick="showPage('rooms',null)"><i class="ti ti-door"></i><span>Rooms</span></div>
    <div class="qa-btn" onclick="showPage('gst',null)"><i class="ti ti-percentage"></i><span>GST</span></div>
  </div>

  <div class="card">
    <div class="card-header"><div class="card-title"><i class="ti ti-clock"></i> Recent Transactions</div></div>
    <div class="table-wrap">
    <table>
      <thead><tr><th>Date</th><th>Voucher</th><th>Party</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>
        ${vouchers.slice(0,10).map(v=>`
        <tr>
          <td>${v.date||'-'}</td>
          <td><span class="badge badge-${v.type==='receipt'?'success':v.type==='payment'?'danger':'info'}">${v.voucherNo||v.type}</span></td>
          <td>${v.party||'-'}</td>
          <td>${v.ledger||v.type}</td>
          <td style="font-weight:600">₹${fmtShort(v.amount)}</td>
          <td><span class="badge badge-${v.status==='pending'?'warning':'success'}">${v.status==='pending'?'Pending':'Done'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
  </div>`;
}

// ===== RECEIPT VOUCHER =====
async function renderReceipt(el) {
  const accSnap = await getDocs(col('accounts'));
  const accounts = accSnap.docs.map(d=>({id:d.id,...d.data()}));
  const vNo = await getVoucherNo('RV');
  const parties = accounts.filter(a=>['Sundry Debtor','Current Asset','Cash','Bank'].includes(a.group)||['Cash in Hand','Bank - SBI'].includes(a.name));
  const incomeAcc = accounts.filter(a=>a.group==='Income');

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-receipt"></i> Receipt Voucher</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="showPage('receipt',null)"><i class="ti ti-refresh"></i> Clear</button>
      <button class="btn btn-primary btn-sm" onclick="saveReceipt()"><i class="ti ti-device-floppy"></i> Save</button>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <div class="form-grid">
        <div class="form-group"><label>Voucher No.</label><input id="rv_no" value="${vNo}" readonly></div>
        <div class="form-group"><label>Date</label><input type="date" id="rv_date" value="${todayStr()}"></div>
        <div class="form-group">
          <label>Party (From Kaun)</label>
          <select id="rv_party">
            <option value="">-- Party Chuniye --</option>
            <option value="Cash">Cash</option>
            ${accounts.map(a=>`<option value="${a.name}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Mode of Payment</label>
          <select id="rv_mode"><option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Cheque</option><option>Card</option></select>
        </div>
        <div class="form-group"><label>Amount (₹)</label><input type="number" id="rv_amount" placeholder="0.00" oninput="updateRVTotal()"></div>
        <div class="form-group">
          <label>Credit Ledger (Income Account)</label>
          <select id="rv_ledger">
            ${incomeAcc.length ? incomeAcc.map(a=>`<option value="${a.name}">${a.name}</option>`).join('') : '<option>Room Rent Income</option><option>Food Income</option><option>Banquet Income</option>'}
          </select>
        </div>
        <div class="form-group"><label>Room No. (Optional)</label><input id="rv_room" placeholder="e.g. 101"></div>
        <div class="form-group">
          <label>Status</label>
          <select id="rv_status"><option value="done">Done</option><option value="pending">Pending</option></select>
        </div>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label>Narration</label>
        <textarea id="rv_narration" placeholder="Being received from... for room rent / services..."></textarea>
      </div>
      <div style="margin-top:12px;padding:14px;background:#eafaf1;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600;color:var(--success)">Total Amount:</span>
        <span style="font-size:22px;font-weight:700;color:var(--success)" id="rv_total">₹0.00</span>
      </div>
    </div>
  </div>`;

  window.updateRVTotal = () => {
    const amt = parseFloat(document.getElementById('rv_amount').value)||0;
    document.getElementById('rv_total').textContent = '₹'+fmt(amt);
  };

  window.saveReceipt = async () => {
    const amount = parseFloat(document.getElementById('rv_amount').value)||0;
    if(!amount) return toast('Amount daalo!','error');
    const party = document.getElementById('rv_party').value;
    if(!party) return toast('Party chuniye!','error');
    try {
      await addDoc(col('vouchers'), {
        prefix:'RV', voucherNo: document.getElementById('rv_no').value,
        type:'receipt', date: document.getElementById('rv_date').value,
        party, mode: document.getElementById('rv_mode').value,
        amount, ledger: document.getElementById('rv_ledger').value,
        room: document.getElementById('rv_room').value,
        status: document.getElementById('rv_status').value,
        narration: document.getElementById('rv_narration').value,
        createdAt: serverTimestamp()
      });
      toast('Receipt Voucher save ho gaya! ✓');
      showPage('receipt', null);
    } catch(e) { toast('Error: '+e.message,'error'); }
  };
}

// ===== PAYMENT VOUCHER =====
async function renderPayment(el) {
  const accSnap = await getDocs(col('accounts'));
  const accounts = accSnap.docs.map(d=>({id:d.id,...d.data()}));
  const vNo = await getVoucherNo('PV');
  const expAcc = accounts.filter(a=>a.group==='Expense'||a.group==='Current Liability');

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-cash"></i> Payment Voucher</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="showPage('payment',null)"><i class="ti ti-refresh"></i> Clear</button>
      <button class="btn btn-primary btn-sm" onclick="savePayment()"><i class="ti ti-device-floppy"></i> Save</button>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <div class="form-grid">
        <div class="form-group"><label>Voucher No.</label><input id="pv_no" value="${vNo}" readonly></div>
        <div class="form-group"><label>Date</label><input type="date" id="pv_date" value="${todayStr()}"></div>
        <div class="form-group">
          <label>Party (To Kaun)</label>
          <select id="pv_party">
            <option value="">-- Party Chuniye --</option>
            ${accounts.map(a=>`<option value="${a.name}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Mode</label>
          <select id="pv_mode"><option>Cash</option><option>Bank Transfer</option><option>UPI</option><option>Cheque</option></select>
        </div>
        <div class="form-group"><label>Amount (₹)</label><input type="number" id="pv_amount" placeholder="0.00"></div>
        <div class="form-group">
          <label>Debit Ledger (Expense Account)</label>
          <select id="pv_ledger">
            ${expAcc.length ? expAcc.map(a=>`<option value="${a.name}">${a.name}</option>`).join('') : '<option>Salary Expense</option><option>Purchase - Food</option><option>Electricity Expense</option>'}
          </select>
        </div>
        <div class="form-group"><label>Cheque No. (if any)</label><input id="pv_cheque" placeholder="Cheque number..."></div>
        <div class="form-group"><label>Status</label><select id="pv_status"><option value="done">Done</option><option value="pending">Pending</option></select></div>
      </div>
      <div class="form-group" style="margin-top:12px">
        <label>Narration</label>
        <textarea id="pv_narration" placeholder="Being paid to... for..."></textarea>
      </div>
    </div>
  </div>`;

  window.savePayment = async () => {
    const amount = parseFloat(document.getElementById('pv_amount').value)||0;
    if(!amount) return toast('Amount daalo!','error');
    const party = document.getElementById('pv_party').value;
    if(!party) return toast('Party chuniye!','error');
    try {
      await addDoc(col('vouchers'), {
        prefix:'PV', voucherNo: document.getElementById('pv_no').value,
        type:'payment', date: document.getElementById('pv_date').value,
        party, mode: document.getElementById('pv_mode').value,
        amount, ledger: document.getElementById('pv_ledger').value,
        cheque: document.getElementById('pv_cheque').value,
        status: document.getElementById('pv_status').value,
        narration: document.getElementById('pv_narration').value,
        createdAt: serverTimestamp()
      });
      toast('Payment Voucher save ho gaya! ✓');
      showPage('payment', null);
    } catch(e) { toast('Error: '+e.message,'error'); }
  };
}

// ===== JOURNAL =====
async function renderJournal(el) {
  const accSnap = await getDocs(col('accounts'));
  const accounts = accSnap.docs.map(d=>({id:d.id,...d.data()}));
  const vNo = await getVoucherNo('JV');
  const opts = accounts.map(a=>`<option value="${a.name}">${a.name}</option>`).join('');

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-notebook"></i> Journal Entry</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="addJRow()"><i class="ti ti-plus"></i> Row</button>
      <button class="btn btn-primary btn-sm" onclick="saveJournal()"><i class="ti ti-device-floppy"></i> Post</button>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <div class="form-grid" style="margin-bottom:14px">
        <div class="form-group"><label>Journal No.</label><input id="jv_no" value="${vNo}" readonly></div>
        <div class="form-group"><label>Date</label><input type="date" id="jv_date" value="${todayStr()}"></div>
      </div>
      <div class="table-wrap">
      <table id="jvTable">
        <thead><tr><th>Account</th><th>Dr (₹)</th><th>Cr (₹)</th><th>Narration</th><th></th></tr></thead>
        <tbody id="jvRows">
          <tr>
            <td><select class="tbl-select" style="min-width:160px">${opts}</select></td>
            <td><input type="number" class="tbl-input jdr" placeholder="0" oninput="calcJTotals()" style="width:90px"></td>
            <td><input type="number" class="tbl-input jcr" placeholder="0" oninput="calcJTotals()" style="width:90px"></td>
            <td><input type="text" class="tbl-input" placeholder="Narration..." style="min-width:140px"></td>
            <td><button class="btn btn-danger btn-sm btn-icon" onclick="this.closest('tr').remove();calcJTotals()"><i class="ti ti-trash"></i></button></td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:var(--bg);font-weight:600">
            <td>Total</td>
            <td id="jTotalDr" style="color:var(--danger)">₹0</td>
            <td id="jTotalCr" style="color:var(--success)">₹0</td>
            <td id="jBalance" colspan="2"></td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  </div>`;

  window.addJRow = () => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><select class="tbl-select" style="min-width:160px">${opts}</select></td>
      <td><input type="number" class="tbl-input jdr" placeholder="0" oninput="calcJTotals()" style="width:90px"></td>
      <td><input type="number" class="tbl-input jcr" placeholder="0" oninput="calcJTotals()" style="width:90px"></td>
      <td><input type="text" class="tbl-input" placeholder="Narration..." style="min-width:140px"></td>
      <td><button class="btn btn-danger btn-sm btn-icon" onclick="this.closest('tr').remove();calcJTotals()"><i class="ti ti-trash"></i></button></td>`;
    document.getElementById('jvRows').appendChild(tr);
  };

  window.calcJTotals = () => {
    const drs = [...document.querySelectorAll('.jdr')].reduce((s,i)=>s+(parseFloat(i.value)||0),0);
    const crs = [...document.querySelectorAll('.jcr')].reduce((s,i)=>s+(parseFloat(i.value)||0),0);
    document.getElementById('jTotalDr').textContent = '₹'+fmtShort(drs);
    document.getElementById('jTotalCr').textContent = '₹'+fmtShort(crs);
    const diff = drs - crs;
    document.getElementById('jBalance').innerHTML = diff===0
      ? '<span style="color:var(--success)">✓ Balanced</span>'
      : `<span style="color:var(--danger)">Diff: ₹${fmtShort(Math.abs(diff))}</span>`;
  };

  window.saveJournal = async () => {
    const rows = [...document.querySelectorAll('#jvRows tr')];
    const entries = rows.map(tr=>({
      account: tr.querySelector('select')?.value,
      dr: parseFloat(tr.querySelectorAll('input')[0]?.value)||0,
      cr: parseFloat(tr.querySelectorAll('input')[1]?.value)||0,
      narration: tr.querySelectorAll('input')[2]?.value
    })).filter(e=>e.dr||e.cr);
    if(!entries.length) return toast('Entries daalo!','error');
    const totalDr = entries.reduce((s,e)=>s+e.dr,0);
    const totalCr = entries.reduce((s,e)=>s+e.cr,0);
    if(Math.abs(totalDr-totalCr)>0.01) return toast('Dr aur Cr equal nahi hain!','error');
    try {
      await addDoc(col('vouchers'), {
        prefix:'JV', voucherNo: document.getElementById('jv_no').value,
        type:'journal', date: document.getElementById('jv_date').value,
        entries, amount: totalDr, createdAt: serverTimestamp()
      });
      toast('Journal Entry post ho gaya! ✓');
      showPage('journal',null);
    } catch(e) { toast('Error: '+e.message,'error'); }
  };
}

// ===== SALES INVOICE =====
async function renderSales(el) {
  const vNo = await getVoucherNo('INV');
  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-file-invoice"></i> Sales Invoice (Bill)</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="window.print()"><i class="ti ti-printer"></i> Print</button>
      <button class="btn btn-primary btn-sm" onclick="saveSales()"><i class="ti ti-device-floppy"></i> Save</button>
    </div>
  </div>
  <div class="card">
    <div class="card-body">
      <div class="invoice-box">
        <div class="invoice-header">
          <div>
            <div style="font-size:20px;font-weight:700;color:var(--primary)">${HOTEL_NAME}</div>
            <div style="font-size:12px;color:var(--muted)">${HOTEL_ADDRESS}</div>
            <div style="font-size:12px;color:var(--muted)">GSTIN: ${HOTEL_GSTIN} | Ph: ${HOTEL_PHONE}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:18px;font-weight:700;color:var(--danger)">TAX INVOICE</div>
            <div style="font-size:12px">No: <strong id="inv_no">${vNo}</strong></div>
            <div style="font-size:12px">Date: <strong>${todayStr()}</strong></div>
          </div>
        </div>
        <div class="form-grid" style="margin-bottom:14px">
          <div class="form-group"><label>Guest / Party Name</label><input id="inv_party" placeholder="Naam..."></div>
          <div class="form-group"><label>Room No.</label><input id="inv_room" placeholder="e.g. 101"></div>
          <div class="form-group"><label>Check-in Date</label><input type="date" id="inv_checkin" value="${todayStr()}"></div>
          <div class="form-group"><label>Check-out Date</label><input type="date" id="inv_checkout"></div>
          <div class="form-group"><label>Mobile</label><input type="tel" id="inv_mobile" placeholder="Party mobile no."></div>
          <div class="form-group"><label>Address</label><input id="inv_addr" placeholder="Party address..."></div>
        </div>
        <div class="table-wrap">
        <table id="invTable">
          <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>GST%</th><th>Amount</th><th></th></tr></thead>
          <tbody id="invRows">
            <tr>
              <td>1</td>
              <td><select class="tbl-select"><option>Room Rent</option><option>Food & Beverage</option><option>Laundry</option><option>Phone/Internet</option><option>Extra Bed</option><option>Other Service</option></select></td>
              <td><input type="number" class="tbl-input inv-qty" value="1" oninput="calcInvTotal()" style="width:55px"></td>
              <td><input type="number" class="tbl-input inv-rate" value="0" oninput="calcInvTotal()" style="width:80px"></td>
              <td><select class="tbl-select inv-gst" onchange="calcInvTotal()"><option value="12">12%</option><option value="18">18%</option><option value="5">5%</option><option value="0">0%</option></select></td>
              <td class="inv-amt" style="font-weight:600">₹0</td>
              <td><button class="btn btn-danger btn-sm btn-icon" onclick="this.closest('tr').remove();calcInvTotal()"><i class="ti ti-trash"></i></button></td>
            </tr>
          </tbody>
        </table>
        </div>
        <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="addInvRow()"><i class="ti ti-plus"></i> Item Add</button>
        <div class="invoice-totals">
          <table style="font-size:13px">
            <tr><td style="padding:4px 8px;color:var(--muted)">Subtotal:</td><td style="padding:4px 8px;text-align:right" id="invSubtotal">₹0</td></tr>
            <tr><td style="padding:4px 8px;color:var(--muted)">GST:</td><td style="padding:4px 8px;text-align:right" id="invGST">₹0</td></tr>
            <tr style="font-size:16px;font-weight:700;color:var(--primary)"><td style="padding:6px 8px">Total:</td><td style="padding:6px 8px;text-align:right" id="invTotal">₹0</td></tr>
          </table>
        </div>
      </div>
    </div>
  </div>`;

  let rowCount = 1;
  window.addInvRow = () => {
    rowCount++;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${rowCount}</td>
      <td><select class="tbl-select"><option>Room Rent</option><option>Food & Beverage</option><option>Laundry</option><option>Extra Bed</option></select></td>
      <td><input type="number" class="tbl-input inv-qty" value="1" oninput="calcInvTotal()" style="width:55px"></td>
      <td><input type="number" class="tbl-input inv-rate" value="0" oninput="calcInvTotal()" style="width:80px"></td>
      <td><select class="tbl-select inv-gst" onchange="calcInvTotal()"><option value="12">12%</option><option value="18">18%</option><option value="5">5%</option><option value="0">0%</option></select></td>
      <td class="inv-amt" style="font-weight:600">₹0</td>
      <td><button class="btn btn-danger btn-sm btn-icon" onclick="this.closest('tr').remove();calcInvTotal()"><i class="ti ti-trash"></i></button></td>`;
    document.getElementById('invRows').appendChild(tr);
  };

  window.calcInvTotal = () => {
    let subtotal=0, gstTotal=0;
    document.querySelectorAll('#invRows tr').forEach(tr=>{
      const qty = parseFloat(tr.querySelector('.inv-qty')?.value)||0;
      const rate = parseFloat(tr.querySelector('.inv-rate')?.value)||0;
      const gst = parseFloat(tr.querySelector('.inv-gst')?.value)||0;
      const base = qty*rate;
      const tax = base*gst/100;
      subtotal+=base; gstTotal+=tax;
      const amt=tr.querySelector('.inv-amt');
      if(amt) amt.textContent='₹'+fmtShort(base+tax);
    });
    document.getElementById('invSubtotal').textContent='₹'+fmt(subtotal);
    document.getElementById('invGST').textContent='₹'+fmt(gstTotal);
    document.getElementById('invTotal').textContent='₹'+fmt(subtotal+gstTotal);
  };

  window.saveSales = async () => {
    const party = document.getElementById('inv_party').value;
    if(!party) return toast('Party naam daalo!','error');
    const totalText = document.getElementById('invTotal').textContent.replace(/[₹,]/g,'');
    const amount = parseFloat(totalText)||0;
    if(!amount) return toast('Amount add karo!','error');
    try {
      await addDoc(col('vouchers'), {
        prefix:'INV', voucherNo: document.getElementById('inv_no').textContent,
        type:'sales', date: todayStr(),
        party, room: document.getElementById('inv_room').value,
        checkin: document.getElementById('inv_checkin').value,
        checkout: document.getElementById('inv_checkout').value,
        mobile: document.getElementById('inv_mobile').value,
        amount, status:'done', createdAt: serverTimestamp()
      });
      toast('Invoice save ho gaya! ✓');
    } catch(e) { toast('Error: '+e.message,'error'); }
  };
}

// ===== PURCHASE =====
async function renderPurchase(el) {
  const accSnap = await getDocs(col('accounts'));
  const accounts = accSnap.docs.map(d=>({id:d.id,...d.data()}));
  const vNo = await getVoucherNo('PURCH');

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-package"></i> Purchase Entry</div>
    <button class="btn btn-primary btn-sm" onclick="savePurchase()"><i class="ti ti-device-floppy"></i> Save</button>
  </div>
  <div class="card">
    <div class="card-body">
      <div class="form-grid" style="margin-bottom:14px">
        <div class="form-group"><label>Purchase No.</label><input id="pur_no" value="${vNo}" readonly></div>
        <div class="form-group"><label>Date</label><input type="date" id="pur_date" value="${todayStr()}"></div>
        <div class="form-group">
          <label>Supplier</label>
          <select id="pur_party">
            <option value="">-- Supplier Chuniye --</option>
            ${accounts.map(a=>`<option value="${a.name}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Supplier Bill No.</label><input id="pur_billno" placeholder="Supplier ka bill no."></div>
        <div class="form-group"><label>Payment Terms</label><select id="pur_terms"><option>Immediate</option><option>Net 30</option><option>Credit</option></select></div>
        <div class="form-group"><label>Total Amount (₹)</label><input type="number" id="pur_amount" placeholder="0.00"></div>
      </div>
      <div class="form-group"><label>Narration</label><textarea id="pur_narration" placeholder="Purchase details..."></textarea></div>
    </div>
  </div>`;

  window.savePurchase = async () => {
    const amount = parseFloat(document.getElementById('pur_amount').value)||0;
    if(!amount) return toast('Amount daalo!','error');
    try {
      await addDoc(col('vouchers'), {
        prefix:'PURCH', voucherNo: document.getElementById('pur_no').value,
        type:'purchase', date: document.getElementById('pur_date').value,
        party: document.getElementById('pur_party').value,
        billNo: document.getElementById('pur_billno').value,
        terms: document.getElementById('pur_terms').value,
        amount, ledger:'Purchase - Food',
        narration: document.getElementById('pur_narration').value,
        createdAt: serverTimestamp()
      });
      toast('Purchase entry save ho gaya! ✓');
      showPage('purchase',null);
    } catch(e) { toast('Error: '+e.message,'error'); }
  };
}

// ===== LEDGER =====
async function renderLedger(el) {
  const accSnap = await getDocs(col('accounts'));
  const accounts = accSnap.docs.map(d=>({id:d.id,...d.data()}));

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-book"></i> Ledger Account</div>
    <button class="btn btn-outline btn-sm" onclick="window.print()"><i class="ti ti-printer"></i> Print</button>
  </div>
  <div class="card">
    <div class="card-body">
      <div class="form-grid" style="margin-bottom:14px">
        <div class="form-group">
          <label>Account Chuniye</label>
          <select id="led_acc" onchange="loadLedger()">
            <option value="">-- Account --</option>
            ${accounts.map(a=>`<option value="${a.name}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>From</label><input type="date" id="led_from" value="${new Date().getFullYear()}-04-01"></div>
        <div class="form-group"><label>To</label><input type="date" id="led_to" value="${todayStr()}"></div>
        <div class="form-group" style="justify-content:flex-end;padding-top:18px">
          <button class="btn btn-primary btn-sm" onclick="loadLedger()"><i class="ti ti-search"></i> View</button>
        </div>
      </div>
      <div id="ledgerResult"><p style="color:var(--muted);text-align:center;padding:20px">Account chuniye aur View dabao</p></div>
    </div>
  </div>`;

  window.loadLedger = async () => {
    const accName = document.getElementById('led_acc').value;
    if(!accName) return;
    const fromDate = document.getElementById('led_from').value;
    const toDate = document.getElementById('led_to').value;
    const snap = await getDocs(col('vouchers'));
    const vouchers = snap.docs.map(d=>({id:d.id,...d.data()}))
      .filter(v=> (v.party===accName||v.ledger===accName) && v.date>=fromDate && v.date<=toDate)
      .sort((a,b)=>a.date?.localeCompare(b.date));
    let balance=0;
    const rows = vouchers.map(v=>{
      const dr = v.type==='payment'||v.type==='purchase' ? Number(v.amount||0) : 0;
      const cr = v.type==='receipt'||v.type==='sales' ? Number(v.amount||0) : 0;
      balance += cr - dr;
      return `<tr>
        <td>${v.date||'-'}</td>
        <td>${v.narration||v.type||'-'}</td>
        <td>${v.voucherNo||'-'}</td>
        <td style="color:var(--danger)">${dr?'₹'+fmtShort(dr):''}</td>
        <td style="color:var(--success)">${cr?'₹'+fmtShort(cr):''}</td>
        <td style="font-weight:600">₹${fmtShort(Math.abs(balance))} ${balance>=0?'Cr':'Dr'}</td>
      </tr>`;
    }).join('');
    document.getElementById('ledgerResult').innerHTML = `
      <div class="table-wrap">
      <table>
        <thead><tr><th>Date</th><th>Particulars</th><th>Vch No.</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:var(--muted)">Koi entry nahi mili</td></tr>'}</tbody>
      </table>
      </div>`;
  };
}

// ===== DAY BOOK =====
async function renderDaybook(el) {
  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-calendar"></i> Day Book</div>
    <div style="display:flex;gap:8px">
      <input type="date" id="db_date" value="${todayStr()}" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">
      <button class="btn btn-primary btn-sm" onclick="loadDaybook()"><i class="ti ti-search"></i> Dekho</button>
    </div>
  </div>
  <div id="daybookResult" class="card">
    <div class="card-body" style="padding:0"><div class="loading"><div class="spinner"></div> Load ho raha hai...</div></div>
  </div>`;
  loadDaybook();

  window.loadDaybook = async () => {
    const date = document.getElementById('db_date').value;
    const snap = await getDocs(col('vouchers'));
    const entries = snap.docs.map(d=>({id:d.id,...d.data()})).filter(v=>v.date===date);
    const total = entries.reduce((s,v)=>s+Number(v.amount||0),0);
    document.getElementById('daybookResult').innerHTML = `
      <div class="table-wrap">
      <table>
        <thead><tr><th>Voucher No.</th><th>Type</th><th>Party</th><th>Ledger</th><th>Amount</th></tr></thead>
        <tbody>
          ${entries.length ? entries.map(v=>`
          <tr>
            <td><span class="badge badge-${v.type==='receipt'?'success':v.type==='payment'?'danger':'info'}">${v.voucherNo||v.type}</span></td>
            <td>${v.type}</td>
            <td>${v.party||'-'}</td>
            <td>${v.ledger||'-'}</td>
            <td style="font-weight:600">₹${fmtShort(v.amount)}</td>
          </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--muted)">Is din koi entry nahi</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="font-weight:700;background:var(--bg)"><td colspan="4" style="text-align:right">Aaj ka Total:</td><td>₹${fmtShort(total)}</td></tr>
        </tfoot>
      </table>
      </div>`;
  };
}

// ===== CASH BOOK =====
async function renderCashbook(el) {
  const snap = await getDocs(col('vouchers'));
  const all = snap.docs.map(d=>({id:d.id,...d.data()}));
  const receipts = all.filter(v=>v.type==='receipt'&&(v.mode==='Cash'||!v.mode));
  const payments = all.filter(v=>v.type==='payment'&&(v.mode==='Cash'||!v.mode));
  const totalRec = receipts.reduce((s,v)=>s+Number(v.amount||0),0);
  const totalPay = payments.reduce((s,v)=>s+Number(v.amount||0),0);
  const opening = 10000;
  const closing = opening + totalRec - totalPay;

  el.innerHTML = `
  <div class="section-header"><div class="section-title"><i class="ti ti-wallet"></i> Cash Book</div></div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-label">Opening Balance</div><div class="stat-value" style="font-size:18px">₹${fmtShort(opening)}</div></div>
    <div class="stat-card"><div class="stat-label">Total Receipt</div><div class="stat-value" style="font-size:18px;color:var(--success)">₹${fmtShort(totalRec)}</div></div>
    <div class="stat-card"><div class="stat-label">Total Payment</div><div class="stat-value" style="font-size:18px;color:var(--danger)">₹${fmtShort(totalPay)}</div></div>
    <div class="stat-card"><div class="stat-label">Closing Balance</div><div class="stat-value" style="font-size:18px;color:var(--warning)">₹${fmtShort(closing)}</div></div>
  </div>
  <div class="two-col">
    <div class="card">
      <div class="card-header"><div class="card-title" style="color:var(--success)"><i class="ti ti-trending-up"></i> Receipt (Dr)</div></div>
      <div style="padding:0">
      <table>
        <thead><tr><th>Date</th><th>Particulars</th><th>Amount</th></tr></thead>
        <tbody>
          ${receipts.map(v=>`<tr><td>${v.date||'-'}</td><td>${v.party||v.ledger||'-'}</td><td style="color:var(--success);font-weight:600">₹${fmtShort(v.amount)}</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--muted)">Koi entry nahi</td></tr>'}
        </tbody>
        <tfoot><tr style="font-weight:700;background:var(--bg)"><td colspan="2">Total</td><td style="color:var(--success)">₹${fmtShort(totalRec)}</td></tr></tfoot>
      </table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title" style="color:var(--danger)"><i class="ti ti-trending-down"></i> Payment (Cr)</div></div>
      <div style="padding:0">
      <table>
        <thead><tr><th>Date</th><th>Particulars</th><th>Amount</th></tr></thead>
        <tbody>
          ${payments.map(v=>`<tr><td>${v.date||'-'}</td><td>${v.party||v.ledger||'-'}</td><td style="color:var(--danger);font-weight:600">₹${fmtShort(v.amount)}</td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--muted)">Koi entry nahi</td></tr>'}
        </tbody>
        <tfoot><tr style="font-weight:700;background:var(--bg)"><td colspan="2">Total</td><td style="color:var(--danger)">₹${fmtShort(totalPay)}</td></tr></tfoot>
      </table>
      </div>
    </div>
  </div>`;
}

// ===== TRIAL BALANCE =====
async function renderTrialBalance(el) {
  const snap = await getDocs(col('vouchers'));
  const all = snap.docs.map(d=>({id:d.id,...d.data()}));
  const accSnap = await getDocs(col('accounts'));
  const accounts = accSnap.docs.map(d=>({id:d.id,...d.data()}));

  const ledgerMap = {};
  accounts.forEach(a => { ledgerMap[a.name] = {name:a.name, group:a.group, dr:Number(a.opening||0)*(a.type==='Dr'?1:0), cr:Number(a.opening||0)*(a.type==='Cr'?1:0)}; });

  all.forEach(v => {
    if(v.type==='receipt') {
      if(!ledgerMap[v.ledger]) ledgerMap[v.ledger]={name:v.ledger,group:'Income',dr:0,cr:0};
      ledgerMap[v.ledger].cr += Number(v.amount||0);
    }
    if(v.type==='payment') {
      if(!ledgerMap[v.ledger]) ledgerMap[v.ledger]={name:v.ledger,group:'Expense',dr:0,cr:0};
      ledgerMap[v.ledger].dr += Number(v.amount||0);
    }
  });

  const rows = Object.values(ledgerMap).filter(a=>a.dr||a.cr);
  const totalDr = rows.reduce((s,a)=>s+a.dr,0);
  const totalCr = rows.reduce((s,a)=>s+a.cr,0);

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-scale"></i> Trial Balance</div>
    <button class="btn btn-outline btn-sm" onclick="window.print()"><i class="ti ti-printer"></i> Print</button>
  </div>
  <div class="card">
    <div style="text-align:center;padding:14px;border-bottom:1px solid var(--border)">
      <div style="font-size:16px;font-weight:700;color:var(--primary)">${HOTEL_NAME}</div>
      <div style="font-size:12px;color:var(--muted)">Trial Balance as on ${todayStr()}</div>
    </div>
    <div class="table-wrap">
    <table>
      <thead><tr><th>Account Name</th><th>Group</th><th style="text-align:right">Debit (₹)</th><th style="text-align:right">Credit (₹)</th></tr></thead>
      <tbody>
        ${rows.map(a=>`
        <tr>
          <td>${a.name}</td>
          <td><span class="badge badge-info">${a.group}</span></td>
          <td style="text-align:right;color:var(--danger)">${a.dr?fmtShort(a.dr):'-'}</td>
          <td style="text-align:right;color:var(--success)">${a.cr?fmtShort(a.cr):'-'}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr style="font-weight:700;font-size:15px;background:var(--bg)">
          <td colspan="2">Total</td>
          <td style="text-align:right;color:var(--danger)">₹${fmtShort(totalDr)}</td>
          <td style="text-align:right;color:var(--success)">₹${fmtShort(totalCr)}</td>
        </tr>
      </tfoot>
    </table>
    </div>
  </div>`;
}

// ===== P&L =====
async function renderPandL(el) {
  const snap = await getDocs(col('vouchers'));
  const all = snap.docs.map(d=>({id:d.id,...d.data()}));
  const income = all.filter(v=>v.type==='receipt'||v.type==='sales').reduce((s,v)=>s+Number(v.amount||0),0);
  const expense = all.filter(v=>v.type==='payment'||v.type==='purchase').reduce((s,v)=>s+Number(v.amount||0),0);
  const profit = income - expense;

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-chart-line"></i> Profit & Loss Statement</div>
    <button class="btn btn-outline btn-sm" onclick="window.print()"><i class="ti ti-printer"></i> Print</button>
  </div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-label">Total Income</div><div class="stat-value" style="color:var(--success)">₹${fmtShort(income)}</div></div>
    <div class="stat-card"><div class="stat-label">Total Expense</div><div class="stat-value" style="color:var(--danger)">₹${fmtShort(expense)}</div></div>
    <div class="stat-card"><div class="stat-label">${profit>=0?'Net Profit':'Net Loss'}</div><div class="stat-value" style="color:${profit>=0?'var(--primary)':'var(--danger)'}">₹${fmtShort(Math.abs(profit))}</div><div class="stat-change ${profit>=0?'up':'down'}"><i class="ti ti-${profit>=0?'trending-up':'trending-down'}"></i> Margin: ${income?Math.round(profit/income*100):0}%</div></div>
  </div>
  <div class="two-col">
    <div class="card">
      <div class="card-header"><div class="card-title" style="color:var(--success)"><i class="ti ti-trending-up"></i> Income (Amdani)</div></div>
      <div style="padding:0">
      <table>
        <tbody>
          ${all.filter(v=>v.type==='receipt'||v.type==='sales').map(v=>`
          <tr><td>${v.ledger||'Sales'}</td><td style="text-align:right;font-weight:600">₹${fmtShort(v.amount)}</td></tr>`).join('') || '<tr><td colspan="2" style="text-align:center;color:var(--muted);padding:20px">Koi income nahi</td></tr>'}
        </tbody>
        <tfoot><tr style="font-weight:700;background:#eafaf1"><td>Total Income</td><td style="text-align:right;color:var(--success)">₹${fmtShort(income)}</td></tr></tfoot>
      </table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title" style="color:var(--danger)"><i class="ti ti-trending-down"></i> Expenses (Kharch)</div></div>
      <div style="padding:0">
      <table>
        <tbody>
          ${all.filter(v=>v.type==='payment'||v.type==='purchase').map(v=>`
          <tr><td>${v.ledger||'Expense'}</td><td style="text-align:right;font-weight:600">₹${fmtShort(v.amount)}</td></tr>`).join('') || '<tr><td colspan="2" style="text-align:center;color:var(--muted);padding:20px">Koi expense nahi</td></tr>'}
        </tbody>
        <tfoot><tr style="font-weight:700;background:#fdedec"><td>Total Expenses</td><td style="text-align:right;color:var(--danger)">₹${fmtShort(expense)}</td></tr></tfoot>
      </table>
      </div>
    </div>
  </div>`;
}

// ===== BALANCE SHEET =====
async function renderBalanceSheet(el) {
  const snap = await getDocs(col('vouchers'));
  const all = snap.docs.map(d=>({id:d.id,...d.data()}));
  const cash = 10000 + all.filter(v=>v.type==='receipt'&&v.mode==='Cash').reduce((s,v)=>s+Number(v.amount||0),0) - all.filter(v=>v.type==='payment'&&v.mode==='Cash').reduce((s,v)=>s+Number(v.amount||0),0);
  const bank = 150000 + all.filter(v=>v.type==='receipt'&&v.mode==='Bank Transfer').reduce((s,v)=>s+Number(v.amount||0),0);
  const capital = 5000000;
  const profit = all.filter(v=>v.type==='receipt'||v.type==='sales').reduce((s,v)=>s+Number(v.amount||0),0) - all.filter(v=>v.type==='payment'||v.type==='purchase').reduce((s,v)=>s+Number(v.amount||0),0);

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-report"></i> Balance Sheet</div>
    <button class="btn btn-outline btn-sm" onclick="window.print()"><i class="ti ti-printer"></i> Print</button>
  </div>
  <div class="two-col">
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-building"></i> Assets (Sampatti)</div></div>
      <div style="padding:0">
      <table>
        <tbody>
          <tr><td style="font-weight:600;color:var(--muted);padding-top:12px" colspan="2">Fixed Assets</td></tr>
          <tr><td style="padding-left:16px">Building & Land</td><td style="text-align:right">₹50,00,000</td></tr>
          <tr><td style="padding-left:16px">Furniture & Fixtures</td><td style="text-align:right">₹8,50,000</td></tr>
          <tr><td style="font-weight:600;color:var(--muted);padding-top:12px" colspan="2">Current Assets</td></tr>
          <tr><td style="padding-left:16px">Cash in Hand</td><td style="text-align:right">₹${fmtShort(cash)}</td></tr>
          <tr><td style="padding-left:16px">Bank - SBI</td><td style="text-align:right">₹${fmtShort(bank)}</td></tr>
        </tbody>
        <tfoot><tr style="font-weight:700;font-size:14px;background:var(--bg)"><td>Total Assets</td><td style="text-align:right;color:var(--primary)">₹${fmtShort(5850000+cash+bank)}</td></tr></tfoot>
      </table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-credit-card"></i> Liabilities (Debt)</div></div>
      <div style="padding:0">
      <table>
        <tbody>
          <tr><td style="font-weight:600;color:var(--muted);padding-top:12px" colspan="2">Capital</td></tr>
          <tr><td style="padding-left:16px">Owner's Capital</td><td style="text-align:right">₹${fmtShort(capital)}</td></tr>
          <tr><td style="padding-left:16px">${profit>=0?'Add: Net Profit':'Less: Net Loss'}</td><td style="text-align:right;color:${profit>=0?'var(--success)':'var(--danger)'}">₹${fmtShort(Math.abs(profit))}</td></tr>
          <tr><td style="font-weight:600;color:var(--muted);padding-top:12px" colspan="2">Current Liabilities</td></tr>
          <tr><td style="padding-left:16px">Creditors</td><td style="text-align:right">₹25,000</td></tr>
          <tr><td style="padding-left:16px">GST Payable</td><td style="text-align:right">₹53,500</td></tr>
        </tbody>
        <tfoot><tr style="font-weight:700;font-size:14px;background:var(--bg)"><td>Total Liab.</td><td style="text-align:right;color:var(--primary)">₹${fmtShort(capital+profit+78500)}</td></tr></tfoot>
      </table>
      </div>
    </div>
  </div>`;
}

// ===== GST REPORT =====
async function renderGST(el) {
  const snap = await getDocs(col('vouchers'));
  const all = snap.docs.map(d=>({id:d.id,...d.data()}));
  const taxableSales = all.filter(v=>v.type==='sales'||v.type==='receipt').reduce((s,v)=>s+Number(v.amount||0),0);
  const outputGST = taxableSales * 0.12;
  const inputGST = all.filter(v=>v.type==='purchase').reduce((s,v)=>s+Number(v.amount||0),0) * 0.05;
  const gstPayable = outputGST - inputGST;

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-percentage"></i> GST Report</div>
    <button class="btn btn-primary btn-sm"><i class="ti ti-download"></i> GSTR-1 Export</button>
  </div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-label">Taxable Sales</div><div class="stat-value" style="font-size:18px">₹${fmtShort(taxableSales)}</div></div>
    <div class="stat-card"><div class="stat-label">Output GST (Collected)</div><div class="stat-value" style="font-size:18px;color:var(--danger)">₹${fmtShort(outputGST)}</div></div>
    <div class="stat-card"><div class="stat-label">Input GST (Credit)</div><div class="stat-value" style="font-size:18px;color:var(--success)">₹${fmtShort(inputGST)}</div></div>
    <div class="stat-card"><div class="stat-label">GST Payable</div><div class="stat-value" style="font-size:18px;color:var(--warning)">₹${fmtShort(gstPayable)}</div></div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">GST Rate-wise Summary</div></div>
    <div class="table-wrap">
    <table>
      <thead><tr><th>GST Rate</th><th>Taxable Amount</th><th>CGST (₹)</th><th>SGST (₹)</th><th>Total GST</th></tr></thead>
      <tbody>
        <tr><td>0% (Exempt)</td><td>₹0</td><td>-</td><td>-</td><td>-</td></tr>
        <tr><td>5% (Food)</td><td>₹${fmtShort(taxableSales*0.15)}</td><td>₹${fmtShort(taxableSales*0.15*0.025)}</td><td>₹${fmtShort(taxableSales*0.15*0.025)}</td><td style="font-weight:600">₹${fmtShort(taxableSales*0.15*0.05)}</td></tr>
        <tr><td>12% (Room &lt;₹7500)</td><td>₹${fmtShort(taxableSales*0.5)}</td><td>₹${fmtShort(taxableSales*0.5*0.06)}</td><td>₹${fmtShort(taxableSales*0.5*0.06)}</td><td style="font-weight:600">₹${fmtShort(taxableSales*0.5*0.12)}</td></tr>
        <tr><td>18% (Room &gt;₹7500)</td><td>₹${fmtShort(taxableSales*0.35)}</td><td>₹${fmtShort(taxableSales*0.35*0.09)}</td><td>₹${fmtShort(taxableSales*0.35*0.09)}</td><td style="font-weight:600">₹${fmtShort(taxableSales*0.35*0.18)}</td></tr>
      </tbody>
      <tfoot><tr style="font-weight:700;background:var(--bg)"><td>Total</td><td>₹${fmtShort(taxableSales)}</td><td>₹${fmtShort(outputGST/2)}</td><td>₹${fmtShort(outputGST/2)}</td><td style="color:var(--danger)">₹${fmtShort(outputGST)}</td></tr></tfoot>
    </table>
    </div>
  </div>`;
}

// ===== ACCOUNTS MASTER =====
async function renderAccounts(el) {
  const accSnap = await getDocs(col('accounts'));
  const accounts = accSnap.docs.map(d=>({id:d.id,...d.data()}));

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-users"></i> Accounts Master</div>
  </div>
  <div class="card" style="margin-bottom:14px">
    <div class="card-header"><div class="card-title"><i class="ti ti-plus"></i> New Account Banao</div></div>
    <div class="card-body">
      <div class="form-grid">
        <div class="form-group"><label>Account Name</label><input id="acc_name" placeholder="e.g. Ramesh Kumar"></div>
        <div class="form-group">
          <label>Group</label>
          <select id="acc_group">
            <option>Cash</option><option>Bank</option><option>Sundry Debtor</option>
            <option>Sundry Creditor</option><option>Income</option><option>Expense</option>
            <option>Current Asset</option><option>Current Liability</option><option>Capital</option>
          </select>
        </div>
        <div class="form-group"><label>Opening Balance (₹)</label><input type="number" id="acc_opening" placeholder="0"></div>
        <div class="form-group"><label>Balance Type</label><select id="acc_type"><option value="Dr">Dr (Debit)</option><option value="Cr">Cr (Credit)</option></select></div>
        <div class="form-group"><label>Mobile</label><input type="tel" id="acc_mobile" placeholder="98765 43210"></div>
        <div class="form-group"><label>GSTIN (optional)</label><input id="acc_gstin" placeholder="Party GSTIN..."></div>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="saveAccount()"><i class="ti ti-device-floppy"></i> Save Account</button>
    </div>
  </div>
  <div class="card">
    <div class="card-body" style="padding:0">
    <div class="table-wrap">
    <table>
      <thead><tr><th>Account Name</th><th>Group</th><th>Opening</th><th>Type</th><th>Action</th></tr></thead>
      <tbody id="accTableBody">
        ${accounts.map(a=>`
        <tr>
          <td style="font-weight:500">${a.name}</td>
          <td><span class="badge badge-info">${a.group||'-'}</span></td>
          <td>₹${fmtShort(a.opening||0)}</td>
          <td><span class="badge badge-${a.type==='Dr'?'danger':'success'}">${a.type||'Dr'}</span></td>
          <td>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteAccount('${a.id}')"><i class="ti ti-trash"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
    </div>
  </div>`;

  window.saveAccount = async () => {
    const name = document.getElementById('acc_name').value.trim();
    if(!name) return toast('Account name daalo!','error');
    try {
      await addDoc(col('accounts'), {
        name, group: document.getElementById('acc_group').value,
        opening: parseFloat(document.getElementById('acc_opening').value)||0,
        type: document.getElementById('acc_type').value,
        mobile: document.getElementById('acc_mobile').value,
        gstin: document.getElementById('acc_gstin').value,
        createdAt: serverTimestamp()
      });
      toast('Account save ho gaya! ✓');
      showPage('accounts', null);
    } catch(e) { toast('Error: '+e.message,'error'); }
  };

  window.deleteAccount = async (id) => {
    if(!confirm('Delete karna chahte ho?')) return;
    await deleteDoc(doc(db, `hotels/${hotelId}/accounts/${id}`));
    toast('Account delete ho gaya','error');
    showPage('accounts', null);
  };
}

// ===== ROOMS =====
async function renderRooms(el) {
  const snap = await getDocs(col('rooms'));
  const rooms = snap.docs.map(d=>({id:d.id,...d.data()}));

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-door"></i> Room Management</div>
    <button class="btn btn-primary btn-sm" onclick="showAddRoom()"><i class="ti ti-plus"></i> Room Add</button>
  </div>
  <div class="room-grid">
    ${rooms.map(r=>`
    <div class="room-card ${r.status||'available'}" onclick="toggleRoomStatus('${r.id}','${r.status}')">
      <div class="room-no" style="color:${r.status==='occupied'?'var(--danger)':r.status==='cleaning'?'var(--warning)':'var(--success)'}">${r.no}</div>
      <div class="room-type">${r.type}</div>
      <span class="badge badge-${r.status==='occupied'?'danger':r.status==='cleaning'?'warning':'success'}">${r.status==='occupied'?'Occupied':r.status==='cleaning'?'Cleaning':'Available'}</span>
      <div class="room-info">${r.status==='occupied'?r.guest||'Guest':'₹'+fmtShort(r.rate)+'/night'}</div>
    </div>`).join('')}
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Room Tariff List</div></div>
    <div class="table-wrap">
    <table>
      <thead><tr><th>Room No.</th><th>Type</th><th>Weekday Rate</th><th>Weekend Rate</th><th>GST%</th><th>Status</th></tr></thead>
      <tbody>
        ${rooms.map(r=>`
        <tr>
          <td style="font-weight:600">${r.no}</td>
          <td>${r.type}</td>
          <td>₹${fmtShort(r.rate)}</td>
          <td>₹${fmtShort(r.weekendRate||r.rate)}</td>
          <td>${r.gst||12}%</td>
          <td><span class="badge badge-${r.status==='occupied'?'danger':r.status==='cleaning'?'warning':'success'}">${r.status||'available'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
  </div>`;

  window.toggleRoomStatus = async (id, currentStatus) => {
    const statuses = ['available','occupied','cleaning'];
    const next = statuses[(statuses.indexOf(currentStatus)+1)%statuses.length];
    let guest = '';
    if(next === 'occupied') guest = prompt('Guest ka naam:')||'Guest';
    await updateDoc(doc(db, `hotels/${hotelId}/rooms/${id}`), {status:next, guest:guest||''});
    toast(`Room ${next} ho gaya`);
    showPage('rooms',null);
  };
}

// ===== INVENTORY =====
async function renderInventory(el) {
  const snap = await getDocs(col('inventory'));
  const items = snap.docs.map(d=>({id:d.id,...d.data()}));

  el.innerHTML = `
  <div class="section-header">
    <div class="section-title"><i class="ti ti-box"></i> Inventory / Stock</div>
    <button class="btn btn-primary btn-sm" onclick="showAddItem()"><i class="ti ti-plus"></i> Item Add</button>
  </div>
  <div class="card" id="addItemCard" style="display:none;margin-bottom:14px">
    <div class="card-header"><div class="card-title">New Item</div></div>
    <div class="card-body">
      <div class="form-grid">
        <div class="form-group"><label>Item Name</label><input id="itm_name" placeholder="e.g. Rice"></div>
        <div class="form-group"><label>Category</label><select id="itm_cat"><option>Food</option><option>Linen</option><option>Toiletry</option><option>Cleaning</option><option>Other</option></select></div>
        <div class="form-group"><label>Stock</label><input type="number" id="itm_stock" placeholder="0"></div>
        <div class="form-group"><label>Unit</label><select id="itm_unit"><option>Kg</option><option>Litre</option><option>Pcs</option><option>Box</option><option>Dozen</option></select></div>
        <div class="form-group"><label>Min Level (Alert)</label><input type="number" id="itm_min" placeholder="0"></div>
        <div class="form-group"><label>Rate (₹)</label><input type="number" id="itm_rate" placeholder="0"></div>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="saveItem()"><i class="ti ti-device-floppy"></i> Save</button>
      <button class="btn btn-outline btn-sm" style="margin-top:10px;margin-left:8px" onclick="document.getElementById('addItemCard').style.display='none'">Cancel</button>
    </div>
  </div>
  <div class="card">
    <div class="table-wrap">
    <table>
      <thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Unit</th><th>Min Level</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${items.map(i=>`
        <tr>
          <td style="font-weight:500">${i.name}</td>
          <td>${i.category}</td>
          <td style="font-weight:600">${i.stock}</td>
          <td>${i.unit}</td>
          <td>${i.minLevel}</td>
          <td><span class="badge badge-${Number(i.stock)<=Number(i.minLevel)?'danger':Number(i.stock)<=Number(i.minLevel)*1.5?'warning':'success'}">${Number(i.stock)<=Number(i.minLevel)?'Low Stock!':Number(i.stock)<=Number(i.minLevel)*1.5?'Alert':'OK'}</span></td>
          <td style="display:flex;gap:4px">
            <button class="btn btn-outline btn-sm btn-icon" onclick="adjustStock('${i.id}',${i.stock})"><i class="ti ti-edit"></i></button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteItem('${i.id}')"><i class="ti ti-trash"></i></button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
  </div>`;

  window.showAddItem = () => { document.getElementById('addItemCard').style.display='block'; };
  window.saveItem = async () => {
    const name = document.getElementById('itm_name').value.trim();
    if(!name) return toast('Item naam daalo!','error');
    await addDoc(col('inventory'), {
      name, category: document.getElementById('itm_cat').value,
      stock: parseFloat(document.getElementById('itm_stock').value)||0,
      unit: document.getElementById('itm_unit').value,
      minLevel: parseFloat(document.getElementById('itm_min').value)||0,
      rate: parseFloat(document.getElementById('itm_rate').value)||0,
      createdAt: serverTimestamp()
    });
    toast('Item save ho gaya! ✓');
    showPage('inventory',null);
  };
  window.adjustStock = async (id, current) => {
    const newStock = prompt(`Current stock: ${current}\nNaya stock enter karo:`, current);
    if(newStock===null) return;
    await updateDoc(doc(db, `hotels/${hotelId}/inventory/${id}`), {stock: parseFloat(newStock)||0});
    toast('Stock update ho gaya! ✓');
    showPage('inventory',null);
  };
  window.deleteItem = async (id) => {
    if(!confirm('Delete karna chahte ho?')) return;
    await deleteDoc(doc(db, `hotels/${hotelId}/inventory/${id}`));
    toast('Item delete ho gaya','error');
    showPage('inventory',null);
  };
}

// ===== SETTINGS =====
async function renderSettings(el) {
  const settingDoc = doc(db, `hotels/${hotelId}/settings/main`);
  const snap = await getDoc(settingDoc);
  const s = snap.exists() ? snap.data() : {};

  el.innerHTML = `
  <div class="section-header"><div class="section-title"><i class="ti ti-settings"></i> Settings</div></div>
  <div class="card">
    <div class="card-header"><div class="card-title">Hotel Information</div></div>
    <div class="card-body">
      <div class="form-grid">
        <div class="form-group"><label>Hotel Name</label><input id="set_name" value="${s.hotelName||''}"></div>
        <div class="form-group"><label>GSTIN</label><input id="set_gstin" value="${s.gstin||''}"></div>
        <div class="form-group"><label>Phone</label><input type="tel" id="set_phone" value="${s.phone||''}"></div>
        <div class="form-group"><label>Email</label><input type="email" id="set_email" value="${s.email||''}"></div>
        <div class="form-group" style="grid-column:1/-1"><label>Address</label><textarea id="set_address">${s.address||''}</textarea></div>
        <div class="form-group"><label>Financial Year Start</label><select id="set_fy"><option ${s.fyStart==='April'?'selected':''}>April</option><option ${s.fyStart==='January'?'selected':''}>January</option></select></div>
        <div class="form-group"><label>Currency</label><select id="set_cur"><option>₹ Indian Rupee</option></select></div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="saveSettings()"><i class="ti ti-device-floppy"></i> Save Settings</button>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title" style="color:var(--danger)"><i class="ti ti-lock"></i> Account</div></div>
    <div class="card-body">
      <p style="color:var(--muted);margin-bottom:12px;font-size:13px">Logged in as: <strong>${currentUser?.email}</strong></p>
      <button class="btn btn-danger btn-sm" onclick="logoutUser()"><i class="ti ti-logout"></i> Logout</button>
    </div>
  </div>`;

  window.saveSettings = async () => {
    try {
      await setDoc(settingDoc, {
        hotelName: document.getElementById('set_name').value,
        gstin: document.getElementById('set_gstin').value,
        phone: document.getElementById('set_phone').value,
        email: document.getElementById('set_email').value,
        address: document.getElementById('set_address').value,
        fyStart: document.getElementById('set_fy').value,
        updatedAt: serverTimestamp()
      }, {merge: true});
      toast('Settings save ho gayi! ✓');
    } catch(e) { toast('Error: '+e.message,'error'); }
  };
}
