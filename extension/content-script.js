// content-script.js

// 1. Get current website or YouTube details (max 200 chars)
function getPageContent() {
  const url = window.location.href;
  let text = "";
  
  try {
    const urlObj = new URL(url);
    
    // 1. Google Search
    if (urlObj.hostname.includes("google.com") && urlObj.pathname.includes("/search")) {
      const q = urlObj.searchParams.get("q");
      if (q) text = `Google Search: "${q}"`;
    }
    
    // 2. Bing Search
    else if (urlObj.hostname.includes("bing.com") && urlObj.pathname.includes("/search")) {
      const q = urlObj.searchParams.get("q");
      if (q) text = `Bing Search: "${q}"`;
    }

    // 3. DuckDuckGo Search
    else if (urlObj.hostname.includes("duckduckgo.com")) {
      const q = urlObj.searchParams.get("q");
      if (q) text = `DuckDuckGo Search: "${q}"`;
    }
    
    // 4. GitHub
    else if (urlObj.hostname.includes("github.com")) {
      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        const repo = `${parts[0]}/${parts[1]}`;
        const subAction = parts[2] ? ` - ${parts.slice(2).join("/")}` : "";
        text = `GitHub: ${repo}${subAction} (${document.title})`;
      }
    }

    // 5. StackOverflow
    else if (urlObj.hostname.includes("stackoverflow.com") && urlObj.pathname.includes("/questions/")) {
      const questionTitle = document.querySelector("#question-header h1 a")?.textContent?.trim() || document.title;
      text = `StackOverflow: ${questionTitle}`;
    }

    // 6. YouTube video extraction
    else if (url.includes("youtube.com/watch")) {
      const videoTitleEl = document.querySelector("h1.ytd-watch-metadata yt-formatted-string") || 
                           document.querySelector("yt-formatted-string.ytd-video-primary-info-renderer") ||
                           document.querySelector("h1.title yt-formatted-string");
      const channelNameEl = document.querySelector("ytd-video-owner-renderer ytd-channel-name a") ||
                            document.querySelector("#owner-name a") ||
                            document.querySelector(".ytd-channel-name a");
      
      const title = videoTitleEl ? videoTitleEl.textContent.trim() : document.title;
      const channel = channelNameEl ? channelNameEl.textContent.trim() : "";
      
      text = channel ? `YouTube: ${title} (${channel})` : `YouTube: ${title}`;
    }
  } catch (e) {
    // Fallback to standard parsing
  }
  
  if (!text) {
    // Standard page title & meta-description extraction
    const title = document.title;
    let description = "";
    const metaDesc = document.querySelector("meta[name='description']") || 
                     document.querySelector("meta[property='og:description']");
    if (metaDesc) {
      description = metaDesc.getAttribute("content") || "";
    }
    
    const h1 = document.querySelector("h1")?.textContent?.trim() || "";
    text = title;
    if (h1 && !title.toLowerCase().includes(h1.toLowerCase()) && h1.length < 60) {
      text = `${title} | Heading: ${h1}`;
    }
    if (description) {
      text = `${text} - ${description}`;
    }
  }
  
  return text.substring(0, 200);
}

// 2. Compute scroll depth (0-100)
function getScrollDepth() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (scrollHeight <= 0) return 0;
  return Math.round((scrollTop / scrollHeight) * 100);
}

// 3. Safe wrapper to send messages - handles context invalidation gracefully
function safeSendMessage(message) {
  try {
    chrome.runtime.sendMessage(message);
  } catch (e) {
    // Extension was reloaded/updated - context is gone, stop the interval
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
}

// 4. Connect User ID automatically from LocalStorage of your main web app
function checkAuthBridge() {
  const userId = localStorage.getItem("aria_clerk_user_id");
  const convexUrl = localStorage.getItem("aria_convex_site_url");
  const userName = localStorage.getItem("aria_user_name");
  if (userId) {
    console.log("[Aria Tracker] Auth Bridge: Found user ID in localStorage:", userId);
    safeSendMessage({ type: "SET_USER_ID", userId, convexUrl, userName });
  }
}

// 5. Send page details to background script
function initPageTracking() {
  const content = getPageContent();
  const url = window.location.href;
  console.log(`[Aria Tracker] Page loaded: ${url} (${content})`);
  safeSendMessage({
    type: "PAGE_LOADED",
    url: url,
    content: content,
    openedAt: Date.now()
  });
}

// 6. Track max scroll depth reached on this tab
let maxScroll = 0;
window.addEventListener("scroll", () => {
  const currentScroll = getScrollDepth();
  if (currentScroll > maxScroll) {
    maxScroll = currentScroll;
    safeSendMessage({ type: "SCROLL_UPDATE", scrollDepth: maxScroll });
  }
}, { passive: true });

// Backup trigger for tab unload
window.addEventListener("beforeunload", () => {
  safeSendMessage({ type: "PAGE_UNLOADING", scrollDepth: maxScroll });
});

// Run
initPageTracking();
checkAuthBridge();
let intervalId = setInterval(checkAuthBridge, 5000); // Re-check every 5s, cleared on context loss
