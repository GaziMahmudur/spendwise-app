var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// cloud-sync.js
var require_cloud_sync = __commonJS({
  "cloud-sync.js"() {
    var FIREBASE_CONFIG = {
      // Copy these exact values from Firebase Console:
      // Project settings → Your apps → Web app → SDK setup and configuration.
      apiKey: "AIzaSyDKtLHw4Ym7gmRt62NCVuj_husMOc7quJ0",
      authDomain: "expenses-tracker-b3763.firebaseapp.com",
      projectId: "expenses-tracker-b3763",
      storageBucket: "expenses-tracker-b3763.firebasestorage.app",
      messagingSenderId: "724764110783",
      appId: "1:724764110783:web:f8aa8a393a808f5f397b0a",
      measurementId: "G-KBNPCYKBHG"
    };
    var _firebaseApp = null;
    var _db = null;
    var _auth = null;
    var _currentUser = null;
    var _syncInProgress = false;
    var _cloudInitialized = false;
    var MIGRATION_KEY = "spendwise_cloud_migrated_v1";
    var CLOUD_META_KEY = "spendwise_cloud_meta";
    async function initFirebase() {
      if (_cloudInitialized) return true;
      if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey === "YOUR_API_KEY" || !FIREBASE_CONFIG.projectId || FIREBASE_CONFIG.projectId === "YOUR_PROJECT_ID" || !FIREBASE_CONFIG.appId || FIREBASE_CONFIG.appId === "YOUR_APP_ID") {
        console.warn(
          "[SpendWise Cloud] Firebase Web App config is incomplete. Add the config from Firebase Console."
        );
        return false;
      }
      try {
        const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
        const { getFirestore, doc, setDoc, getDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        const {
          getAuth,
          GoogleAuthProvider,
          signInWithPopup,
          signInWithCredential,
          signOut,
          onAuthStateChanged
        } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
        if (!getApps().length) {
          _firebaseApp = initializeApp(FIREBASE_CONFIG);
        } else {
          _firebaseApp = getApps()[0];
        }
        _db = getFirestore(_firebaseApp);
        _auth = getAuth(_firebaseApp);
        window._fsModules = {
          doc,
          setDoc,
          getDoc,
          collection,
          GoogleAuthProvider,
          signInWithPopup,
          signInWithCredential,
          signOut,
          onAuthStateChanged
        };
        _cloudInitialized = true;
        onAuthStateChanged(_auth, async (user) => {
          _currentUser = user;
          updateCloudUI();
          if (user) {
            try {
              await checkAndRunMigration();
            } catch (err) {
              console.error("[SpendWise Cloud] Post-login migration error:", err);
            }
          }
        });
        return true;
      } catch (err) {
        console.error("[SpendWise Cloud] Firebase init error:", err);
        updateCloudStatus("error", "Firebase initialization failed.");
        return false;
      }
    }
    async function checkAndRunMigration() {
      if (!_currentUser) return;
      const alreadyMigrated = localStorage.getItem(MIGRATION_KEY);
      if (alreadyMigrated) return;
      const cloudData = await fetchCloudData();
      if (cloudData && cloudData.expenses && cloudData.expenses.length > 0) {
        localStorage.setItem(MIGRATION_KEY, "merged");
        updateCloudStatus(
          "synced",
          `Cloud data found (${cloudData.expenses.length} expenses). Auto-restoring\u2026`
        );
        await restoreFromCloud(true);
        return;
      }
      const localState = getLocalState();
      const totalItems = (localState.expenses?.length || 0) + (localState.balanceRecords?.length || 0);
      if (totalItems > 0) {
        updateCloudStatus(
          "syncing",
          `Migrating ${totalItems} local records to cloud\u2026`
        );
        const success = await pushToCloud(localState, true);
        if (success) {
          localStorage.setItem(MIGRATION_KEY, "done");
          updateCloudStatus(
            "synced",
            `\u2705 ${totalItems} records backed up to cloud!`
          );
          showToast(`\u2601\uFE0F ${totalItems} records auto-backed up to cloud!`, "success");
        }
      } else {
        localStorage.setItem(MIGRATION_KEY, "done");
        updateCloudStatus("synced", "Cloud backup ready.");
      }
    }
    function getLocalState() {
      try {
        const raw = localStorage.getItem("spendwise_v2");
        return raw ? JSON.parse(raw) : { expenses: [], categories: [], balanceRecords: [] };
      } catch {
        return { expenses: [], categories: [], balanceRecords: [] };
      }
    }
    async function pushToCloud(dataObj, silent = false) {
      if (!_currentUser || !_db) return false;
      if (_syncInProgress) return false;
      _syncInProgress = true;
      if (!silent) updateCloudStatus("syncing", "Uploading to cloud\u2026");
      try {
        const { doc, setDoc } = window._fsModules;
        const userId = _currentUser.uid;
        const payload = {
          ...dataObj,
          _meta: {
            uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
            deviceId: getDeviceId(),
            appVersion: "2.0",
            uid: userId,
            email: _currentUser.email,
            displayName: _currentUser.displayName
          }
        };
        await setDoc(doc(_db, "spendwise_backups", userId), payload);
        saveMeta({
          lastBackup: (/* @__PURE__ */ new Date()).toISOString(),
          email: _currentUser.email
        });
        if (!silent) {
          updateCloudStatus(
            "synced",
            `Backed up ${(/* @__PURE__ */ new Date()).toLocaleTimeString()}`
          );
          showToast("\u2601\uFE0F Data backed up to cloud!", "success");
        }
        return true;
      } catch (err) {
        console.error("[SpendWise Cloud] Push error:", err);
        if (!silent) {
          updateCloudStatus("error", "Upload failed: " + err.message);
          showToast("Cloud backup failed: " + err.message, "error");
        }
        return false;
      } finally {
        _syncInProgress = false;
      }
    }
    async function fetchCloudData() {
      if (!_currentUser || !_db) return null;
      try {
        const { doc, getDoc } = window._fsModules;
        const snap = await getDoc(doc(_db, "spendwise_backups", _currentUser.uid));
        return snap.exists() ? snap.data() : null;
      } catch (err) {
        console.error("[SpendWise Cloud] Fetch error:", err);
        return null;
      }
    }
    async function restoreFromCloud(silent = false) {
      if (!_currentUser || !_db) {
        if (!silent) showToast("Please sign in first.", "error");
        return;
      }
      if (!silent) updateCloudStatus("syncing", "Downloading from cloud\u2026");
      try {
        const cloudData = await fetchCloudData();
        if (!cloudData) {
          if (!silent) {
            updateCloudStatus("idle", "No cloud backup found.");
            showToast("No cloud backup found for this account.", "info");
          }
          return;
        }
        const { _meta, ...cleanData } = cloudData;
        const restoredState = {
          expenses: Array.isArray(cleanData.expenses) ? cleanData.expenses : [],
          categories: Array.isArray(cleanData.categories) ? cleanData.categories : [],
          balanceRecords: Array.isArray(cleanData.balanceRecords) ? cleanData.balanceRecords : [],
          currency: cleanData.currency || "taka"
        };
        const localState = getLocalState();
        const merged = mergeStates(localState, restoredState);
        localStorage.setItem("spendwise_v2", JSON.stringify(merged));
        if (typeof loadState === "function") {
          loadState();
          renderAll();
        }
        const total = restoredState.expenses.length + restoredState.balanceRecords.length;
        if (!silent) {
          updateCloudStatus("synced", `Restored ${total} records.`);
          showToast(`\u2601\uFE0F Restored ${total} records from cloud!`, "success");
        }
      } catch (err) {
        console.error("[SpendWise Cloud] Restore error:", err);
        if (!silent) {
          updateCloudStatus("error", "Restore failed: " + err.message);
          showToast("Cloud restore failed: " + err.message, "error");
        }
      }
    }
    function mergeStates(local, cloud) {
      const mergeArray = (localArr, cloudArr) => {
        const map = {};
        [...localArr || [], ...cloudArr || []].forEach((item) => {
          const existing = map[item.id];
          if (!existing) {
            map[item.id] = item;
            return;
          }
          const existTs = existing.updatedAt || existing.createdAt || "";
          const newTs = item.updatedAt || item.createdAt || "";
          if (newTs > existTs) map[item.id] = item;
        });
        return Object.values(map);
      };
      const catMap = {};
      [...cloud.categories || []].forEach((c) => catMap[c.id] = c);
      [...local.categories || []].forEach((c) => {
        if (!catMap[c.id]) catMap[c.id] = c;
      });
      return {
        expenses: mergeArray(local.expenses, cloud.expenses),
        categories: Object.values(catMap),
        balanceRecords: mergeArray(local.balanceRecords, cloud.balanceRecords),
        currency: cloud.currency || local.currency || "taka"
      };
    }
    function updateCloudUI() {
      const signedIn = !!_currentUser;
      const signInBtn = document.getElementById("cloudSignInBtn");
      const signOutBtn = document.getElementById("cloudSignOutBtn");
      const backupBtn = document.getElementById("cloudBackupBtn");
      const restoreBtn = document.getElementById("cloudRestoreBtn");
      const userInfo = document.getElementById("cloudUserInfo");
      const cloudSection = document.getElementById("cloudSyncSection");
      if (!cloudSection) return;
      if (signedIn) {
        if (signInBtn) signInBtn.style.display = "none";
        if (signOutBtn) signOutBtn.style.display = "inline-flex";
        if (backupBtn) backupBtn.disabled = false;
        if (restoreBtn) restoreBtn.disabled = false;
        if (userInfo) {
          userInfo.textContent = `Signed in as ${_currentUser.email}`;
          userInfo.style.display = "block";
        }
        const meta = getMeta();
        if (meta && meta.lastBackup) {
          updateCloudStatus(
            "synced",
            `Last backup: ${new Date(meta.lastBackup).toLocaleString()}`
          );
        } else {
          updateCloudStatus("idle", "Ready to backup.");
        }
      } else {
        if (signInBtn) signInBtn.style.display = "inline-flex";
        if (signOutBtn) signOutBtn.style.display = "none";
        if (backupBtn) backupBtn.disabled = true;
        if (restoreBtn) restoreBtn.disabled = true;
        if (userInfo) userInfo.style.display = "none";
        updateCloudStatus("idle", "Sign in to enable cloud backup.");
      }
    }
    function updateCloudStatus(type, message) {
      const el = document.getElementById("cloudStatusMsg");
      if (!el) return;
      const icons = {
        idle: "\u2601\uFE0F",
        syncing: "\u{1F504}",
        "signing-in": "\u{1F510}",
        synced: "\u2705",
        error: "\u274C"
      };
      const colors = {
        idle: "var(--text-muted)",
        syncing: "var(--primary)",
        "signing-in": "var(--primary)",
        synced: "var(--green)",
        error: "var(--red)"
      };
      el.innerHTML = `<span class="cloud-status-icon">${icons[type] || "\u2601\uFE0F"}</span> ${message}`;
      el.style.color = colors[type] || "var(--text-muted)";
      if (type === "syncing" || type === "signing-in") {
        el.classList.add("pulsing");
      } else {
        el.classList.remove("pulsing");
      }
    }
    function saveMeta(data) {
      const existing = getMeta() || {};
      localStorage.setItem(
        CLOUD_META_KEY,
        JSON.stringify({ ...existing, ...data })
      );
    }
    function getMeta() {
      try {
        return JSON.parse(localStorage.getItem(CLOUD_META_KEY) || "null");
      } catch {
        return null;
      }
    }
    function getDeviceId() {
      let id = localStorage.getItem("spendwise_device_id");
      if (!id) {
        id = "dev_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
        localStorage.setItem("spendwise_device_id", id);
      }
      return id;
    }
    document.addEventListener("DOMContentLoaded", () => {
      if (FIREBASE_CONFIG.apiKey !== "YOUR_FIREBASE_WEB_API_KEY") {
        initFirebase().then(() => updateCloudUI());
      } else {
        updateCloudStatus(
          "idle",
          "\u2699\uFE0F Configure Firebase in cloud-sync.js to enable cloud backup."
        );
      }
    });
  }
});
export default require_cloud_sync();
