import { CONFIG } from '../lib/config.js';
import {
  supabaseSignIn,
  supabaseSignUp,
  supabaseGetUserSettings,
  supabaseSaveUserSettings,
  supabaseGetSavedWordsCount,
} from '../lib/supabase-api.js';

// Elements
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const authForm = document.getElementById('auth-form');
const inputEmail = document.getElementById('input-email');
const inputPassword = document.getElementById('input-password');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnAuthText = document.getElementById('btn-auth-text');
const authSpinner = document.getElementById('auth-spinner');
const alertBox = document.getElementById('alert-box');

// Dashboard Elements
const userEmailEl = document.getElementById('user-email');
const wordCountEl = document.getElementById('word-count');
const aiStatusIcon = document.getElementById('ai-status-icon');
const aiStatusDesc = document.getElementById('ai-status-desc');
const btnToggleKeyInput = document.getElementById('btn-toggle-key-input');
const keyInputBox = document.getElementById('key-input-box');
const inputApiKey = document.getElementById('input-api-key');
const btnSaveKey = document.getElementById('btn-save-key');
const btnOpenApp = document.getElementById('btn-open-app');
const btnLogout = document.getElementById('btn-logout');

let currentTab = 'login'; // 'login' | 'signup'

// ─── Helpers ──────────────────────────────────────────────────
function showAlert(message, type = 'error') {
  alertBox.className = `alert-box ${type}`;
  alertBox.innerText = message;
  alertBox.classList.remove('hidden');
}

function clearAlert() {
  alertBox.classList.add('hidden');
  alertBox.innerText = '';
}

function setLoading(isLoading) {
  if (isLoading) {
    btnAuthSubmit.disabled = true;
    authSpinner.classList.remove('hidden');
    btnAuthText.innerText = currentTab === 'login' ? 'Đang đăng nhập...' : 'Đang đăng ký...';
  } else {
    btnAuthSubmit.disabled = false;
    authSpinner.classList.add('hidden');
    btnAuthText.innerText = currentTab === 'login' ? 'Đăng nhập' : 'Đăng ký';
  }
}

function updateAiStatusUi(apiKey) {
  if (apiKey && apiKey.trim()) {
    aiStatusIcon.className = 'ai-status-icon';
    aiStatusIcon.innerText = '✓';
    aiStatusDesc.innerText = 'Đã có API Key & sẵn sàng dịch ngữ cảnh!';
    inputApiKey.value = apiKey;
    keyInputBox.classList.add('hidden');
    btnToggleKeyInput.innerText = 'Đổi Key';
  } else {
    aiStatusIcon.className = 'ai-status-icon warning';
    aiStatusIcon.innerText = '!';
    aiStatusDesc.innerText = 'Chưa có API Key. Nhập bên dưới để dịch AI.';
    keyInputBox.classList.remove('hidden');
    btnToggleKeyInput.innerText = 'Ẩn ô nhập';
  }
}

// ─── Đồng bộ Settings & API Key từ Supabase ───────────────────
async function syncUserSettingsFromCloud(accessToken, userId) {
  try {
    const settings = await supabaseGetUserSettings(accessToken, userId);
    if (settings?.api_key && settings.api_key.trim()) {
      const key = settings.api_key.trim();
      await chrome.storage.local.set({ gemini_api_key: key });
      return key;
    }
  } catch (err) {
    console.warn('Sync user settings error:', err);
  }
  return null;
}

// ─── Chuyển đổi View Trực Tiếp Từ chrome.storage.local ──────────
async function refreshState() {
  clearAlert();
  const store = await chrome.storage.local.get(['auth_session', 'gemini_api_key']);
  const session = store.auth_session;

  if (session?.access_token && session?.user) {
    // ĐÃ ĐĂNG NHẬP
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');

    userEmailEl.innerText = session.user.email || 'User';

    // Xử lý API Key
    let currentApiKey = store.gemini_api_key;
    if (!currentApiKey) {
      currentApiKey = await syncUserSettingsFromCloud(session.access_token, session.user.id);
    }
    updateAiStatusUi(currentApiKey);

    // Lấy số lượng từ đã lưu
    try {
      const count = await supabaseGetSavedWordsCount(session.access_token, session.user.id);
      wordCountEl.innerText = count ?? 0;
    } catch {
      wordCountEl.innerText = 0;
    }
  } else {
    // CHƯA ĐĂNG NHẬP
    authView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
  }
}

// ─── Xử lý Tab Đăng nhập / Đăng ký ────────────────────────────
tabLogin.onclick = () => {
  currentTab = 'login';
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  btnAuthText.innerText = 'Đăng nhập';
  clearAlert();
};

tabSignup.onclick = () => {
  currentTab = 'signup';
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  btnAuthText.innerText = 'Đăng ký';
  clearAlert();
};

// ─── Xử lý Submit Form Đăng nhập / Đăng ký ─────────────────────
authForm.onsubmit = async (e) => {
  e.preventDefault();
  clearAlert();
  setLoading(true);

  const email = inputEmail.value.trim();
  const password = inputPassword.value;

  try {
    if (currentTab === 'login') {
      const data = await supabaseSignIn(email, password);
      // Lưu ngay vào local storage
      await chrome.storage.local.set({ auth_session: data });

      // Đồng bộ API key nếu có
      await syncUserSettingsFromCloud(data.access_token, data.user?.id);

      showAlert('Đăng nhập thành công!', 'success');
      // Chuyển view Dashboard ngay
      await refreshState();
    } else {
      await supabaseSignUp(email, password);
      showAlert('Đăng ký thành công! Hãy đăng nhập bằng tài khoản này.', 'success');
      tabLogin.click();
    }
  } catch (err) {
    showAlert(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
};

// ─── Toggle & Lưu Gemini API Key ──────────────────────────────
btnToggleKeyInput.onclick = () => {
  keyInputBox.classList.toggle('hidden');
  if (keyInputBox.classList.contains('hidden')) {
    btnToggleKeyInput.innerText = 'Đổi Key';
  } else {
    btnToggleKeyInput.innerText = 'Ẩn ô nhập';
    inputApiKey.focus();
  }
};

btnSaveKey.onclick = async () => {
  const newKey = inputApiKey.value.trim();
  if (!newKey) {
    showAlert('Vui lòng nhập API key hợp lệ.');
    return;
  }

  // Lưu vào local
  await chrome.storage.local.set({ gemini_api_key: newKey });

  // Đồng bộ lên Supabase nếu có session
  const store = await chrome.storage.local.get(['auth_session']);
  const session = store.auth_session;
  if (session?.access_token && session?.user?.id) {
    await supabaseSaveUserSettings(session.access_token, session.user.id, { api_key: newKey });
  }

  showAlert('Đã lưu Gemini API Key thành công!', 'success');
  updateAiStatusUi(newKey);
};

// ─── Nút Mở Web App ────────────────────────────────────────────
btnOpenApp.onclick = () => {
  chrome.tabs.create({ url: `${CONFIG.WEB_APP_URL}/?tab=basket` });
};

// ─── Nút Đăng xuất ────────────────────────────────────────────
btnLogout.onclick = async () => {
  await chrome.storage.local.remove(['auth_session', 'gemini_api_key']);
  inputEmail.value = '';
  inputPassword.value = '';
  await refreshState();
};

// Khởi chạy khi mở popup
refreshState();
