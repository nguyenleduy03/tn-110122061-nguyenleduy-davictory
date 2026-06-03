/**
 * Lexi Usage Tracking - Frontend Handler
 *
 * Monitors AI responses for usage tracking information and displays
 * notifications when tracking fails.
 *
 * Integrates with AI Engine without modifying core files.
 */

(function () {
  "use strict";

  // Initialize namespace
  window.lexi = window.lexi || {};
  window.lexi.tracking = window.lexi.tracking || {};

  function getTrackingState() {
    if (!window.lexi.tracking.blockedRequestState) {
      window.lexi.tracking.blockedRequestState = {
        code: null,
        expiresAt: 0,
        consumed: false,
      };
    }

    return window.lexi.tracking.blockedRequestState;
  }

  function markBlockedRequestHandled(code) {
    const state = getTrackingState();
    state.code = code;
    state.expiresAt = Date.now() + 8000;
    state.consumed = false;
  }

  function formatLc(limit) {
    const numericLimit = Number(limit);

    if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
      return null;
    }

    return `${Math.round(numericLimit / 1000).toLocaleString()} LC`;
  }

  function isFreePlan(limitData) {
    return String(limitData?.plan || "").toLowerCase() === "free";
  }

  function getPricingButtons(limitData) {
    const usdUrl = limitData?.pricing?.usd || "/pricing/";
    const vndUrl = limitData?.pricing?.vnd || "/vi/bang-gia/";

    return {
      button1: {
        text: "USD",
        onClick: usdUrl,
        target: "_blank",
      },
      button2: {
        text: "VND",
        onClick: vndUrl,
        target: "_blank",
      },
    };
  }

  /**
   * Check if notification utilities are available
   */
  function isNotificationAvailable() {
    return window.lexi?.utils?.notification;
  }

  /**
   * Display tracking notification
   *
   * @param {Object} tracking - Tracking info from backend
   */
  function displayTrackingNotification(tracking) {
    if (!isNotificationAvailable()) {
      console.warn("[LEXI] Notification utility not available");
      return;
    }

    if (tracking.error) {
      window.lexi.utils.notification({
        state: "error",
        title: "Usage Tracking Failed",
        content:
          tracking.message ||
          "Failed to log usage data. Please contact support if this persists.",
        duration: 5000,
        dismissible: true,
      });

      console.error("[LEXI] Failed to log usage:", {
        app: tracking.app,
        tokens: tracking.tokens,
        message: tracking.message,
      });
    } else if (
      tracking.success &&
      window.lexi.tracking.showSuccessNotifications
    ) {
      // Optional success notification (disabled by default)
      window.lexi.utils.notification({
        state: "success",
        title: "Usage Logged",
        content: `${tracking.tokens} tokens tracked for ${tracking.app}`,
        duration: 2000,
        dismissible: true,
      });
    }

    // Update stats display if available
    if (tracking.stats && tracking.app) {
      updateUsageStatsDisplay(tracking.app, tracking.stats);
    }
  }

  /**
   * Display usage limit notification
   *
   * @param {Object} limitData - Limit data from error response
   */
  function displayLimitNotification(limitData) {
    if (!isNotificationAvailable()) {
      console.warn("[LEXI] Notification utility not available");
      return;
    }

    const lcLimit = formatLc(limitData?.limit);
    const isFreeLimit = isFreePlan(limitData);
    const message = isFreeLimit
      ? `You have used your free ${lcLimit || "20 LC"} per week in LexiSpeak. Please upgrade for unlimited usage or wait until next Monday for reset.`
      : `You have reached your ${limitData.plan} plan limit of ${lcLimit || `${limitData.limit.toLocaleString()} units`} per week in LexiSpeak. Please upgrade for unlimited usage or wait until next Monday for reset.`;
    const pricingButtons = getPricingButtons(limitData);

    window.lexi.utils.notification({
      state: "error",
      title: isFreeLimit ? "Free Limit Reached" : "Usage Limit Reached",
      content: message,
      button1: pricingButtons.button1,
      button2: pricingButtons.button2,
      duration: 0,
      dismissible: true,
    });

    console.warn("[LEXI] Usage limit exceeded:", limitData);
  }

  /**
   * Display paid-plan-only notification (guest/free)
   *
   * @param {Object} limitData - Data from backend error response
   */
  function displayPaidOnlyNotification(limitData) {
    if (!isNotificationAvailable()) {
      console.warn("[LEXI] Notification utility not available");
      return;
    }

    if (limitData?.reason === "guest") {
      window.lexi.utils.notification({
        state: "warning",
        title: "Login Required",
        content: "Log in to use your free 20 LC per week in LexiSpeak.",
        duration: 0,
        dismissible: true,
      });

      if (window.lexi?.utils?.header?.authPopup?.openCenter) {
        window.lexi.utils.header.authPopup.openCenter();
      }

      console.warn("[LEXI] Guest login required:", limitData);
      return;
    }

    const message =
      limitData?.message ||
      "LexiSpeak Beta is available only on paid plans. Please upgrade by visiting the pricing page.";
    const pricingButtons = getPricingButtons(limitData);

    window.lexi.utils.notification({
      state: "warning",
      title: "Upgrade Required",
      content: message,
      button1: pricingButtons.button1,
      button2: pricingButtons.button2,
      duration: 0,
      dismissible: true,
    });

    console.warn("[LEXI] Paid plan required:", limitData);
  }

  /**
   * Update usage stats display in the DOM
   *
   * @param {string} app - App identifier
   * @param {Object} stats - Stats from backend
   */
  function updateUsageStatsDisplay(app, stats) {
    const statsElements = document.querySelectorAll(".lx-usage-stats");

    if (statsElements.length === 0) {
      return;
    }

    statsElements.forEach((element) => {
      // Update plan name
      const planElement = element.querySelector(".lx-usage-stats__plan");
      if (planElement) {
        planElement.textContent = stats.plan_name;
      }

      // Handle unlimited display
      if (stats.unlimited) {
        return;
      }

      // Update current usage
      const currentElement = element.querySelector(".lx-usage-stats__current");
      if (currentElement) {
        const currentK = Math.round(stats.current_usage / 1000);
        currentElement.textContent = `${currentK.toLocaleString()} LC`;
      }

      // Update limit
      const limitElement = element.querySelector(".lx-usage-stats__limit");
      if (limitElement) {
        const limitK = Math.round(stats.limit / 1000);
        limitElement.textContent = `${limitK.toLocaleString()} LC`;
      }

      // Update state classes
      element.classList.remove("lx-usage-stats--warning", "lx-usage-stats--error");

      if (stats.exceeded) {
        element.classList.add("lx-usage-stats--error");
      } else if (stats.percentage >= 90) {
        element.classList.add("lx-usage-stats--warning");
      }
    });
  }

  /**
   * Hook into AI Engine's chatbot reply handler
   */
  function initializeTrackingMonitor() {
    // Check if MwaiAPI is available
    if (typeof MwaiAPI === "undefined") {
      setTimeout(initializeTrackingMonitor, 500);
      return;
    }

    // Add filter to process replies
    MwaiAPI.addFilter("ai.reply", function (reply, params) {
      // Check for tracking information
      if (reply?.lexi_tracking) {
        const tracking = reply.lexi_tracking;

        if (tracking.enabled) {
          displayTrackingNotification(tracking);
        }
      } else {
        // For streaming responses, fetch stats after delay
        setTimeout(fetchTrackingStats, 500);
      }

      return reply;
    });
  }

  /**
   * Fetch tracking stats from backend transient
   * Used for streaming responses where tracking data isn't in reply
   */
  function fetchTrackingStats() {
    const ajaxUrl = "/wp-admin/admin-ajax.php";
    const formData = new FormData();
    formData.append("action", "lexi_get_tracking_status");

    fetch(ajaxUrl, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          console.warn(
            "[LEXI] Failed to fetch tracking status:",
            response.status
          );
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (data?.enabled) {
          displayTrackingNotification(data);
        }
      })
      .catch((error) => {
        console.error("[LEXI] Error fetching tracking stats:", error);
      });
  }

  /**
   * Check if URL is AI Engine request
   *
   * @param {string} url - Request URL
   * @return {boolean} True if AI Engine request
   */
  function isAIEngineRequest(url) {
    return (
      typeof url === "string" &&
      (url.includes("/mwai-ui/v1/") || url.includes("/mwai/v1/"))
    );
  }

  /**
   * Handle error response (limit exceeded)
   *
   * @param {Response} response - Cloned response
   */
  function handleErrorResponse(response) {
    response
      .json()
      .then((data) => {
        const limitData = data?.data?.lexi_limit_data;
        if (!limitData) return;

        if (data.code === "lexi_no_access") {
          markBlockedRequestHandled(data.code);
          displayPaidOnlyNotification(limitData);
          return;
        }

        if (data.code === "lexi_usage_limit_exceeded") {
          markBlockedRequestHandled(data.code);
          displayLimitNotification(limitData);
        }
      })
      .catch((err) => {
        console.error("[LEXI] Error parsing 403 response:", err);
      });
  }

  /**
   * Handle success response (tracking data)
   *
   * @param {Response} response - Cloned response
   */
  function handleSuccessResponse(response) {
    response
      .json()
      .then((data) => {
        if (data?.lexi_tracking?.enabled) {
          displayTrackingNotification(data.lexi_tracking);
        }
      })
      .catch(() => {
        // Silent fail for parsing errors
      });
  }

  /**
   * Intercept fetch requests for AI Engine endpoints
   * Fallback if MwaiAPI filters don't work
   */
  function interceptFetchRequests() {
    const originalFetch = window.fetch;

    window.fetch = function (...args) {
      const [url] = args;

      if (!isAIEngineRequest(url)) {
        return originalFetch.apply(this, args);
      }

      return originalFetch.apply(this, args).then((response) => {
        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");

        // Only process JSON responses (not SSE/streaming)
        if (!isJson) {
          return response;
        }

        const clonedResponse = response.clone();

        // Handle error or success responses
        if (!response.ok && response.status === 403) {
          handleErrorResponse(clonedResponse);
        } else {
          handleSuccessResponse(clonedResponse);
        }

        return response;
      });
    };
  }

  /**
   * Configuration
   */
  window.lexi.tracking.config = {
    showSuccessNotifications: false,
    debug: false,
  };

  /**
   * Public API
   */
  window.lexi.tracking.setConfig = function (options) {
    Object.assign(window.lexi.tracking.config, options);
  };

  window.lexi.tracking.consumeBlockedRequestToast = function () {
    const state = getTrackingState();

    if (state.consumed || !state.code || Date.now() > state.expiresAt) {
      state.code = null;
      state.expiresAt = 0;
      state.consumed = false;
      return null;
    }

    state.consumed = true;
    return state.code;
  };

  // Expose for debugging
  window.lexi.tracking.showSuccessNotifications = false;

  /**
   * Initialize on DOM ready
   */
  function initialize() {
    initializeTrackingMonitor();
    interceptFetchRequests();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
