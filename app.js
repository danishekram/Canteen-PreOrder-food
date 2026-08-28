/* ============================================================
   TIFFIN — Real Firebase Authentication & Firestore DB
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyD6l2OqyrfwDW34m1cgqYw2-Lqcgw7i90g",
  authDomain: "canteen-preorder-food.firebaseapp.com",
  projectId: "canteen-preorder-food",
  storageBucket: "canteen-preorder-food.firebasestorage.app",
  messagingSenderId: "362955143031",
  appId: "1:362955143031:web:26c198e2454048be451372",
  measurementId: "G-TJRHRYC1PY"
};

// Initialize Firebase (Compatibility Mode)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

/* ---------- Real User Registration ---------- */
async function registerUser(name, email, password) {
  if (!auth) {
    toast("Firebase is not loaded.");
    return;
  }
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const user = cred.user;
    await user.updateProfile({ displayName: name });

    const studentObj = {
      id: user.uid,
      name: name,
      email: email.toLowerCase(),
      role: 'student',
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        await db.collection('users').doc(user.uid).set(studentObj);
      } catch (e) {
        console.warn("Firestore write skipped:", e);
      }
    }
    setSession(studentObj);
    toast('Account created successfully!');
    return studentObj;
  } catch (err) {
    toast(err.message);
    throw err;
  }
}

/* ---------- Real User Login (Firebase + Local Demo Support) ---------- */
async function loginUser(email, password) {
  const normEmail = email.toLowerCase().trim();

  // 1. Check local demo credentials first
  const localUsers = getUsers();
  const demoUser = localUsers.find(u => u.email.toLowerCase() === normEmail && u.password === password);
  if (demoUser) {
    setSession(demoUser);
    toast('Welcome back, ' + demoUser.name + '!');
    return demoUser;
  }

  // 2. Firebase Authentication
  if (!auth) {
    toast("Firebase is not loaded.");
    return;
  }

  try {
    const cred = await auth.signInWithEmailAndPassword(normEmail, password);
    const user = cred.user;

    let studentObj = {
      id: user.uid,
      name: user.displayName || user.email.split('@')[0] || 'Student',
      email: normEmail,
      role: 'student'
    };

    if (db) {
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
          studentObj = doc.data();
        }
      } catch (e) {
        console.warn("Firestore read skipped:", e);
      }
    }

    setSession(studentObj);
    toast('Welcome back!');
    return studentObj;
  } catch (err) {
    toast(err.message);
    throw err;
  }
}

/* ---------- Real Google Sign In ---------- */
let isGoogleAuthInProgress = false;

async function loginWithGoogle() {
  if (!auth) {
    alert("Firebase Auth is not initialized. Make sure scripts are loaded.");
    return;
  }

  if (isGoogleAuthInProgress) return;
  isGoogleAuthInProgress = true;

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const studentObj = {
      id: user.uid,
      name: user.displayName || 'Student',
      email: (user.email || '').toLowerCase(),
      role: 'student',
      createdAt: new Date().toISOString()
    };

    if (db) {
      try {
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        if (!doc.exists) {
          await userRef.set(studentObj);
        } else {
          const remoteData = doc.data();
          if (remoteData.name) studentObj.name = remoteData.name;
        }
      } catch (dbErr) {
        console.warn("Firestore sync skipped:", dbErr);
      }
    }

    setSession(studentObj);
    toast('Signed in successfully!');
    return studentObj;
  } catch (err) {
    console.error("Google Auth Error:", err);
    if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
      alert("Google Sign-In Error: " + err.message);
    }
    throw err;
  } finally {
    isGoogleAuthInProgress = false;
  }
}

/* ============================================================
   TIFFIN — Data Layer & LocalStorage Sync
   ============================================================ */

const DB_KEYS = {
  users: 'tiffin_users',
  menu: 'tiffin_menu',
  orders: 'tiffin_orders',
  session: 'tiffin_session',
  adminSession: 'tiffin_admin_session',
  tokenCounter: 'tiffin_token_counter',
  cartPrefix: 'tiffin_cart_'
};

function readJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
}
function writeJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

/* ---------- Seed data ---------- */
function seedIfEmpty(){
  if(!localStorage.getItem(DB_KEYS.users)){
    writeJSON(DB_KEYS.users, [
      { id:'u-admin', name:'Canteen Staff', email:'admin@canteen.com', password:'admin123', role:'admin' },
      { id:'u-demo', name:'Aarav Shah', email:'aarav@campus.edu', password:'demo1234', role:'student' }
    ]);
  }
  if(!localStorage.getItem(DB_KEYS.menu)){
    writeJSON(DB_KEYS.menu, [
      { id:'m1', name:'Masala Dosa', category:'Breakfast', price:60, desc:'Crisp rice crepe, spiced potato filling, coconut chutney & sambar.', veg:true, available:true, img:'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80' },
      { id:'m2', name:'Poha', category:'Breakfast', price:35, desc:'Flattened rice tossed with mustard, peanuts, curry leaf & lime.', veg:true, available:true, img:'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=80' },
      { id:'m3', name:'Paneer Butter Masala Thali', category:'Meals', price:110, desc:'Paneer curry, dal, jeera rice, 2 rotis & salad.', veg:true, available:true, img:'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80' },
      { id:'m4', name:'Chicken Curry Thali', category:'Meals', price:130, desc:'Home-style chicken curry, dal, rice, 2 rotis & salad.', veg:false, available:true, img:'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=80' },
      { id:'m5', name:'Veg Fried Rice', category:'Meals', price:75, desc:'Wok-tossed rice, seasonal veggies, soy & spring onion.', veg:true, available:true, img:'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=80' },
      { id:'m6', name:'Samosa (2 pc)', category:'Snacks', price:25, desc:'Golden fried pastry, spiced potato-pea filling.', veg:true, available:true, img:'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80' },
      { id:'m7', name:'Veg Sandwich', category:'Snacks', price:45, desc:'Grilled bread, cucumber, tomato, chutney & cheese.', veg:true, available:true, img:'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80' },
      { id:'m8', name:'Chicken Puff', category:'Snacks', price:40, desc:'Flaky pastry with a spiced minced chicken filling.', veg:false, available:false, img:'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&auto=format&fit=crop&q=80' },
      { id:'m9', name:'Cold Coffee', category:'Beverages', price:40, desc:'Chilled, frothy & double-shot strong.', veg:true, available:true, img:'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80' },
      { id:'m10', name:'Masala Chai', category:'Beverages', price:15, desc:'Strong ginger-cardamom tea, campus favourite.', veg:true, available:true, img:'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80' },
      { id:'m11', name:'Fresh Lime Soda', category:'Beverages', price:25, desc:'Sweet, salted or mixed — your call at pickup.', veg:true, available:true, img:'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80' },
      { id:'m12', name:'Gulab Jamun (2 pc)', category:'Desserts', price:30, desc:'Warm milk-solid dumplings in cardamom syrup.', veg:true, available:true, img:'https://images.unsplash.com/photo-1605197584547-c93de1a0c497?w=500&auto=format&fit=crop&q=80' }
    ]);
  }
  if(!localStorage.getItem(DB_KEYS.orders)) writeJSON(DB_KEYS.orders, []);
  if(!localStorage.getItem(DB_KEYS.tokenCounter)) localStorage.setItem(DB_KEYS.tokenCounter, '100');
}

/* ---------- Users ---------- */
function getUsers(){ return readJSON(DB_KEYS.users, []); }
function saveUsers(list){ writeJSON(DB_KEYS.users, list); }
function findUserByEmail(email){ return getUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase()); }

/* ---------- Menu ---------- */
function getMenu(){ return readJSON(DB_KEYS.menu, []); }
function saveMenu(list){ writeJSON(DB_KEYS.menu, list); }

/* ---------- Orders ---------- */
function getOrders(){ return readJSON(DB_KEYS.orders, []); }
function saveOrders(list){ writeJSON(DB_KEYS.orders, list); }
function nextToken(){
  const n = parseInt(localStorage.getItem(DB_KEYS.tokenCounter) || '100', 10) + 1;
  localStorage.setItem(DB_KEYS.tokenCounter, String(n));
  return n;
}

/* ---------- Cart (per student & guest) ---------- */
function cartKey(uid){ return DB_KEYS.cartPrefix + (uid || 'guest'); }
function getCart(uid){ return readJSON(cartKey(uid || 'guest'), []); }
function saveCart(uid, cart){ writeJSON(cartKey(uid || 'guest'), cart); }
function cartCount(uid){ return getCart(uid || 'guest').reduce((s,i)=>s+i.qty,0); }

/* ---------- Sessions ---------- */
function getSession(){ return readJSON(DB_KEYS.session, null); }

function setSession(userOrUid){
  let uidVal;
  let userObj = null;

  if (typeof userOrUid === 'object' && userOrUid !== null) {
    uidVal = userOrUid.id;
    userObj = userOrUid;
    
    // Save to local user array so synchronous lookup functions can find them
    const users = getUsers();
    const idx = users.findIndex(u => u.id === uidVal);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...userObj };
    } else {
      users.push(userObj);
    }
    saveUsers(users);
  } else {
    uidVal = userOrUid;
  }

  writeJSON(DB_KEYS.session, { uid: uidVal, user: userObj });

  // Merge guest cart into student account
  const guestCart = getCart('guest');
  if (guestCart.length > 0) {
    const userCart = getCart(uidVal);
    guestCart.forEach(gItem => {
      const existing = userCart.find(uItem => uItem.dishId === gItem.dishId);
      if (existing) {
        existing.qty += gItem.qty;
      } else {
        userCart.push(gItem);
      }
    });
    saveCart(uidVal, userCart);
    localStorage.removeItem(cartKey('guest'));
  }
}

function clearSession(){ 
  localStorage.removeItem(DB_KEYS.session); 
  if (auth) {
    auth.signOut().catch(() => {});
  }
}

function currentStudent(){
  const s = getSession();
  if(!s) return null;
  if(s.user && s.user.role === 'student') return s.user;
  return getUsers().find(u => u.id === s.uid && u.role === 'student') || null;
}

function requireStudentAuth(){
  const u = currentStudent();
  if(!u){ window.location.href = 'login.html'; return null; }
  return u;
}

function getAdminSession(){ return readJSON(DB_KEYS.adminSession, null); }
function setAdminSession(uid){ writeJSON(DB_KEYS.adminSession, { uid }); }
function clearAdminSession(){ localStorage.removeItem(DB_KEYS.adminSession); }
function currentStaff(){
  const s = getAdminSession();
  if(!s) return null;
  return getUsers().find(u => u.id === s.uid && u.role === 'admin') || null;
}
function requireAdminAuth(){
  const u = currentStaff();
  if(!u){ window.location.href = 'admin-login.html'; return null; }
  return u;
}

/* ---------- Helpers ---------- */
function uid(prefix){ return prefix + '-' + Math.random().toString(36).slice(2,9); }
function money(n){ return '₹' + Number(n).toFixed(0); }
function toast(msg){
  let el = document.getElementById('toast');
  if(!el){ el = document.createElement('div'); el.id='toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> el.classList.remove('show'), 2400);
}
function fmtTime(iso){
  const d = new Date(iso);
  return d.toLocaleString(undefined, { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short' });
}

/* Updated Status Flow & Labels for Cancel/Reject Support */
const STATUS_FLOW = ['pending', 'accepted', 'preparing', 'ready', 'completed'];

const STATUS_LABEL = { 
  pending: 'Order placed', 
  accepted: 'Accepted by canteen', 
  preparing: 'Being prepared', 
  ready: 'Ready for pickup', 
  completed: 'Picked up',
  cancelled: 'Cancelled by you',
  rejected: 'Declined by kitchen'
};

/* ---------- Nav ---------- */
function renderNav(active){
  const root = document.getElementById('nav-root');
  if(!root) return;
  const student = currentStudent();
  const count = cartCount(student ? student.id : 'guest');
  root.innerHTML = `
    <nav class="nav">
      <div class="nav-inner">
        <a href="index.html" class="brand">
          <img class="brand-logo-img" src="https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=120&auto=format&fit=crop&q=80" alt="Tiffin Logo">
          <div>TIFFIN<small>Campus Canteen</small></div>
        </a>
        <button class="nav-toggle" id="navToggle" type="button" aria-label="Toggle Menu">☰</button>
        <div class="nav-links" id="navLinks">
          <a href="menu.html" class="${active==='menu'?'active':''}">Menu</a>
          <a href="track.html" class="${active==='track'?'active':''}">Track order</a>
          <a href="orders.html" class="${active==='orders'?'active':''}">Order history</a>
          ${student ? `<span class="nav-user">${student.name.split(' ')[0]}</span><a href="#" id="logoutLink">Log out</a>` : `<a href="login.html" class="${active==='login'?'active':''}">Log in</a>`}
          <a href="cart.html" class="cart-pill">🧺 Cart${count?` · ${count}`:''}</a>
        </div>
      </div>
    </nav>`;

  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if(toggle && links) {
    toggle.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      links.classList.toggle('open');
    };
  }

  const logout = document.getElementById('logoutLink');
  if(logout) {
    logout.addEventListener('click', (e)=>{ 
      e.preventDefault(); 
      clearSession(); 
      window.location.href='login.html'; 
    });
  }
}

document.addEventListener('DOMContentLoaded', seedIfEmpty);

// ============================================================
// INVENTORY STOCK TOGGLE & PRINT SLIP HELPERS
// ============================================================

// 1. Toggle Item In-Stock / Sold-Out status
function toggleItemStock(itemId) {
  let menu = getMenu();
  const index = menu.findIndex(m => m.id === itemId);
  if (index !== -1) {
    menu[index].available = !menu[index].available;
    saveMenu(menu);
    toast(`${menu[index].name} marked as ${menu[index].available ? 'In Stock' : 'Sold Out'}`);
  }
}

// 2. Print 58mm/80mm Thermal Receipt Slip
function printOrderSlip(orderId) {
  const order = getOrders().find(o => o.id === orderId);
  if (!order) return;

  const printWindow = window.open('', '_blank', 'width=380,height=600');
  const itemsHtml = order.items.map(item => `
    <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
      <span>${item.name} x ${item.qty}</span>
      <span>${money(item.price * item.qty)}</span>
    </div>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Token #${order.token}</title>
      <style>
        @page { margin: 0; }
        body {
          font-family: 'Courier New', monospace;
          width: 280px;
          margin: 10px auto;
          padding: 10px;
          color: #000;
        }
        .text-center { text-align: center; }
        .dashed { border-top: 1px dashed #000; margin: 8px 0; }
        .token { font-size: 32px; font-weight: 800; margin: 6px 0; }
        .bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="text-center">
        <h2 style="margin:0;">TIFFIN CANTEEN</h2>
        <p style="margin:2px 0; font-size:12px;">Campus Pre-Order Token</p>
        <div class="dashed"></div>
        <div class="token">#${order.token}</div>
        <div class="dashed"></div>
      </div>
      <div style="font-size:12px; margin-bottom:6px;">
        <div><b>Time:</b> ${new Date(order.createdAt).toLocaleTimeString()}</div>
        <div><b>Pickup:</b> ${new Date(order.pickupTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        <div><b>Status:</b> ${order.status.toUpperCase()}</div>
      </div>
      <div class="dashed"></div>
      ${itemsHtml}
      <div class="dashed"></div>
      <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold;">
        <span>TOTAL:</span>
        <span>${money(order.total)}</span>
      </div>
      <div class="dashed"></div>
      <p class="text-center" style="font-size:11px; margin-top:10px;">Please show this slip or token number at the counter.</p>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}