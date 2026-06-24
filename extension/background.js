// background.js
importScripts("db.js");

// Persistent sessions helper functions
async function getActiveSessions() {
  const data = await chrome.storage.local.get("activeSessions");
  return data.activeSessions || {};
}

async function saveActiveSessions(sessions) {
  await chrome.storage.local.set({ activeSessions: sessions });
}

const lastActiveTabInWindow = new Map(); // windowId -> tabId
let userId = null;
let userName = "";
let blacklist = [];
let convexUrl = "https://wandering-antelope-3.convex.site"; // Default fallback

// Initialize storage settings
async function initializeState() {
  console.log("[Background] Initializing extension state...");
  const data = await chrome.storage.local.get(["userId", "userName", "blacklist", "convexUrl"]);
  if (data.userId) {
    userId = data.userId;
    console.log("[Background] Active User Connected:", userId);
  } else {
    console.log("[Background] No active user session found. Status: Disconnected.");
  }
  if (data.userName) {
    userName = data.userName;
    console.log("[Background] Active User Name:", userName);
  }
  if (data.blacklist) {
    blacklist = data.blacklist;
    console.log("[Background] Excluded domains loaded:", blacklist);
  }
  if (data.convexUrl) {
    convexUrl = data.convexUrl;
    console.log("[Background] Convex site URL loaded:", convexUrl);
  }
}
initializeState();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.userId) {
    userId = changes.userId.newValue;
    console.log("[Background] User ID updated in storage:", userId);
  }
  if (changes.userName) {
    userName = changes.userName.newValue || "";
    console.log("[Background] User Name updated in storage:", userName);
  }
  if (changes.blacklist) {
    blacklist = changes.blacklist.newValue || [];
    console.log("[Background] Excluded domains updated:", blacklist);
  }
  if (changes.convexUrl) {
    convexUrl = changes.convexUrl.newValue || "https://wandering-antelope-3.convex.site";
    console.log("[Background] Convex site URL updated in storage:", convexUrl);
  }
});

// Filter out blacklisted URLs or non-standard protocol pages
function isUrlTrackable(urlStr) {
  if (!urlStr || urlStr.startsWith("chrome://") || urlStr.startsWith("chrome-extension://")) {
    return false;
  }
  try {
    const url = new URL(urlStr);
    return !blacklist.some(domain => url.hostname === domain || url.hostname.endsWith("." + domain));
  } catch (e) {
    return false;
  }
}

// End tab tracking and log duration/scrollDepth
async function closeTrackingSession(tabId) {
  const sessions = await getActiveSessions();
  const session = sessions[tabId];
  if (!session) return;

  const duration = Date.now() - session.openedAt;
  
  if (duration >= 3000) { // must be active for at least 3s (dwell threshold met)
    await AriaDB.updateEvent(session.clientUuid, {
      duration: duration,
      scrollDepth: session.scrollDepth || 0
    });
  } else {
    // Too short (dwell threshold not met) -> delete from IndexedDB
    await AriaDB.deleteEvent(session.clientUuid);
    console.log(`[Background] Dwell threshold not met (${duration}ms). Rolled back visit: ${session.url}`);
  }

  const currentSessions = await getActiveSessions();
  delete currentSessions[tabId];
  await saveActiveSessions(currentSessions);
}

// Begin tab tracking
async function startTrackingSession(tabId, url, content, openedAt) {
  if (!userId || !isUrlTrackable(url)) return;

  const initialSessions = await getActiveSessions();
  if (initialSessions[tabId]) {
    await closeTrackingSession(tabId);
  }

  const clientUuid = self.crypto.randomUUID();
  
  // Insert into IndexedDB immediately (revertable if closed before 3s)
  await AriaDB.addEvent({
    clientUuid,
    userId,
    url,
    content,
    openedAt,
    duration: null,
    scrollDepth: 0
  });

  const sessions = await getActiveSessions();
  sessions[tabId] = {
    clientUuid,
    openedAt,
    url,
    content,
    scrollDepth: 0
  };
  await saveActiveSessions(sessions);
}

// Message Router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === "SET_USER_ID") {
    chrome.storage.local.set({ 
      userId: message.userId,
      convexUrl: message.convexUrl || "https://wandering-antelope-3.convex.site",
      userName: message.userName || ""
    });
    return;
  }

  if (message.type === "FORCE_SYNC") {
    syncUnsyncedEvents().then(() => sendResponse({ success: true }));
    return true; // async handler
  }

  if (!tabId) return;

  switch (message.type) {
    case "PAGE_LOADED":
      startTrackingSession(tabId, message.url, message.content, message.openedAt);
      break;
    case "SCROLL_UPDATE":
      getActiveSessions().then(async (sessions) => {
        const session = sessions[tabId];
        if (session) {
          session.scrollDepth = message.scrollDepth;
          await saveActiveSessions(sessions);
        }
      });
      break;
    case "PAGE_UNLOADING":
      closeTrackingSession(tabId);
      break;
  }
});

// Switch Tabs handler
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const windowId = activeInfo.windowId;
  const prevTabId = lastActiveTabInWindow.get(windowId);
  
  if (prevTabId && prevTabId !== activeInfo.tabId) {
    await closeTrackingSession(prevTabId);
  }

  lastActiveTabInWindow.set(windowId, activeInfo.tabId);
});

// Close Tab handler
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await closeTrackingSession(tabId);
  for (const [winId, tId] of lastActiveTabInWindow.entries()) {
    if (tId === tabId) {
      lastActiveTabInWindow.delete(winId);
    }
  }
});

// Window Minimizing/Leaving handler
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    const sessions = await getActiveSessions();
    for (const tabId of Object.keys(sessions)) {
      await closeTrackingSession(parseInt(tabId, 10));
    }
  } else {
    chrome.tabs.query({ active: true, windowId: windowId }, async (tabs) => {
      if (tabs.length > 0 && tabs[0].url) {
        lastActiveTabInWindow.set(windowId, tabs[0].id);
      }
    });
  }
});

// Sync Alarm
chrome.alarms.create("sync-activities", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "sync-activities") {
    await syncUnsyncedEvents();
  }
});

async function syncUnsyncedEvents() {
  console.log("[Sync] Checking for unsynced logs...");
  if (!userId) {
    console.log("[Sync] No userId connected. Skipping sync.");
    return;
  }

  try {
    const unsynced = await AriaDB.getUnsyncedEvents();
    if (unsynced.length === 0) {
      console.log("[Sync] No unsynced activities found. Skipping sync.");
      return;
    }

    console.log(`[Sync] Found ${unsynced.length} unsynced logs. Sending to Convex...`);
    
    // Filter out local-only fields (like synced and userId) and omit null values for optional fields
    const payload = unsynced.map(({ clientUuid, url, content, openedAt, duration, scrollDepth }) => {
      const item = {
        clientUuid,
        url,
        openedAt,
      };
      if (content !== undefined && content !== null) {
        item.content = content;
      }
      if (duration !== undefined && duration !== null) {
        item.duration = duration;
      }
      if (scrollDepth !== undefined && scrollDepth !== null) {
        item.scrollDepth = scrollDepth;
      }
      return item;
    });

    const response = await fetch(`${convexUrl}/api/sync-activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, events: payload })
    });

    if (response.ok) {
      await AriaDB.markEventsSynced(unsynced);
      console.log(`[Sync] Successfully synced ${unsynced.length} events to Convex.`);
    } else {
      console.error("[Sync] Convex sync endpoint returned error:", await response.text());
    }
  } catch (e) {
    console.error("[Sync] Network or connection error during sync:", e);
  }
}
