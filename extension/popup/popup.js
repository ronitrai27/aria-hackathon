// popup/popup.js

let currentTabDomain = "";

async function updateUI(userId) {
  const statusBadge = document.getElementById("connection-status");
  const connectCard = document.getElementById("connect-card");
  const trackingCard = document.getElementById("tracking-card");
  const syncCard = document.getElementById("sync-card");

  if (userId) {
    statusBadge.textContent = "Connected";
    statusBadge.className = "status-badge";
    connectCard.style.display = "none";
    trackingCard.style.display = "block";
    syncCard.style.display = "block";
  } else {
    statusBadge.textContent = "Disconnected";
    statusBadge.className = "status-badge disconnected";
    connectCard.style.display = "block";
    trackingCard.style.display = "none";
    syncCard.style.display = "none";
  }
}

// Directly reads localStorage from a tab using scripting API - no content script needed
async function readLocalStorageFromTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        userId: localStorage.getItem("aria_clerk_user_id"),
        convexUrl: localStorage.getItem("aria_convex_site_url"),
        userName: localStorage.getItem("aria_user_name"),
      }),
    });
    return results?.[0]?.result || null;
  } catch (e) {
    return null;
  }
}

async function initPopup() {
  // 1. Get current active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.url) {
    try {
      const urlObj = new URL(activeTab.url);
      currentTabDomain = urlObj.hostname;
      document.getElementById("active-url").textContent = currentTabDomain;
    } catch (e) {
      document.getElementById("active-url").textContent = "Unsupported page";
      document.getElementById("tracking-toggle").disabled = true;
    }
  }

  // 2. Load blacklist state for current domain
  const { blacklist = [], userId, userName } = await chrome.storage.local.get(["blacklist", "userId", "userName"]);
  if (currentTabDomain) {
    document.getElementById("tracking-toggle").checked = !blacklist.includes(currentTabDomain);
  }

  // 3. Update connection UI
  await updateUI(userId);
  updateUnsyncedCount();

  // 4. Connect Button: scan open tabs using scripting API to read localStorage directly
  document.getElementById("connect-btn").addEventListener("click", async () => {
    const btn = document.getElementById("connect-btn");
    btn.textContent = "Scanning tabs...";
    btn.disabled = true;

    const allTabs = await chrome.tabs.query({});
    let found = false;

    for (const tab of allTabs) {
      if (!tab.id || !tab.url) continue;
      try {
        const tabHostname = new URL(tab.url).hostname;
        if (tabHostname !== "localhost" && !tabHostname.includes("aria-os")) continue;
      } catch (e) {
        continue;
      }

      // Use scripting API to directly read from the tab's localStorage
      const data = await readLocalStorageFromTab(tab.id);
      if (data && data.userId) {
        console.log("[Popup] Found user ID via scripting API:", data.userId);
        await chrome.storage.local.set({
          userId: data.userId,
          convexUrl: data.convexUrl || "https://wandering-antelope-3.convex.site",
          userName: data.userName || ""
        });
        await updateUI(data.userId);
        updateUnsyncedCount();
        found = true;
        break;
      }
    }

    if (!found) {
      btn.textContent = "Not Found – Try Refreshing the App";
    } else {
      btn.textContent = "✓ Connected!";
    }

    setTimeout(() => {
      btn.textContent = "Connect to Aria App Tab";
      btn.disabled = false;
    }, 2500);
  });

  // 5. Disconnect Button
  document.getElementById("disconnect-btn").addEventListener("click", async () => {
    await chrome.storage.local.remove(["userId", "convexUrl", "userName"]);
    await updateUI(null);
  });

  // 6. Blacklist domain toggle
  document.getElementById("tracking-toggle").addEventListener("change", async (e) => {
    if (!currentTabDomain) return;
    const { blacklist = [] } = await chrome.storage.local.get("blacklist");
    let updated = [...blacklist];
    if (e.target.checked) {
      updated = updated.filter(d => d !== currentTabDomain);
    } else if (!updated.includes(currentTabDomain)) {
      updated.push(currentTabDomain);
    }
    await chrome.storage.local.set({ blacklist: updated });
  });

  // 7. Force Sync Button
  document.getElementById("sync-now-btn").addEventListener("click", async () => {
    const btn = document.getElementById("sync-now-btn");
    btn.textContent = "Syncing...";
    btn.disabled = true;
    chrome.runtime.sendMessage({ type: "FORCE_SYNC" }, () => {
      setTimeout(() => {
        updateUnsyncedCount();
        btn.textContent = "Sync Queue Now";
        btn.disabled = false;
      }, 1500);
    });
  });
}

function updateUnsyncedCount() {
  const request = indexedDB.open("AriaActivityDB", 5);
  request.onsuccess = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("pendingEvents")) {
      document.getElementById("unsynced-count").textContent = "0";
      return;
    }
    const transaction = db.transaction("pendingEvents", "readonly");
    const countReq = transaction.objectStore("pendingEvents").index("synced").count(0);
    countReq.onsuccess = () => {
      document.getElementById("unsynced-count").textContent = countReq.result;
    };
  };
  request.onerror = () => {
    document.getElementById("unsynced-count").textContent = "0";
  };
}

initPopup();
