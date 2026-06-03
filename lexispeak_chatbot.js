window.lexi.utils.getLastAIReply = function (botId) {
  try {
    const chatbotContainer = document.getElementById(`mwai-chatbot-${botId}`);
    if (!chatbotContainer) return null;

    const aiReplies =
      chatbotContainer.getElementsByClassName("mwai-reply mwai-ai");
    if (aiReplies.length === 0) return null;

    const latestAIReply =
      aiReplies[aiReplies.length - 1].getElementsByClassName("mwai-text")[0];
    if (!latestAIReply) return null;

    // Remove <span> elements with blank text content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = latestAIReply.innerHTML;
    tempDiv.querySelectorAll("span").forEach((span) => {
      if (!span.textContent.trim()) {
        span.remove();
      }
    });

    return tempDiv.innerHTML;
  } catch (error) {
    console.error("Error getting latest AI HTML reply:", error);
    return null;
  }
};

// .mwai-ai => .mwai-user
window.lexi.utils.getLastUserReply = function (botId) {
  try {
    const chatbotContainer = document.getElementById(`mwai-chatbot-${botId}`);
    if (!chatbotContainer) return null;

    const userReplies = chatbotContainer.getElementsByClassName(
      "mwai-reply mwai-user"
    );
    if (userReplies.length === 0) return null;

    const latestUserReply =
      userReplies[userReplies.length - 1].getElementsByClassName(
        "mwai-text"
      )[0];
    if (!latestUserReply) return null;

    // Remove <span> elements with blank text content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = latestUserReply.innerHTML;
    tempDiv.querySelectorAll("span").forEach((span) => {
      if (!span.textContent.trim()) {
        span.remove();
      }
    });

    return tempDiv.innerHTML;
  } catch (error) {
    console.error("Error getting latest user reply:", error);
    return null;
  }
};

/**
 * Controls a chatbot instance.
 * @param {string|null} chatbotId - Target chatbot ID; null selects the default bot.
 * @param {boolean} shouldOpen - Open the chatbot UI if true.
 * @param {string|null} messageText - Optional message to queue or send.
 * @param {boolean} sendImmediately - Send the message right away when true.
 * @param {boolean} shouldClear - Clear chat history before any other action when true.
 * @param {boolean} isSystem - Wrap the message in system markup if true.
 * @param {function|null} callback - Invoked with the chatbot reply when provided.
 *
 * Examples:
 * controlChatbot(null, true, "Hello!", true, false);
 * controlChatbot(null, true, "What is 2+2?", true, false, false, (reply) => console.log(reply));
 * controlChatbot("my-bot", true, "System notification", true, false, true, (reply) => handleSystemReply(reply));
 */
window.lexi.utils.controlChatbot = function controlChatbot(
  chatbotId,
  shouldOpen,
  messageText,
  sendImmediately,
  shouldClear,
  isSystem = false,
  callback = null
) {
  // Check if MwaiAPI is available
  if (!window.MwaiAPI || typeof MwaiAPI.getChatbot !== "function") {
    return false;
  }

  // Get the chatbot instance
  let chatbot = MwaiAPI.getChatbot(chatbotId);

  // Validate chatbot instance
  if (!chatbot) {
    return false;
  }

  // Disable all AI buttons at the start of the process
  if (typeof window.lexi.utils.disableElement === "function") {
    window.lexi.utils.disableElement(".lx-ai-btn");
  }

  // Set up response callback if provided
  if ((callback && typeof callback === "function") || messageText) {
    // Get the actual botId from the chatbot instance for accurate filtering
    const targetBotId = chatbot.botId || chatbot.customId || chatbotId;

    // Flag to ensure callback runs only once
    let hasRun = false;

    // Set up error monitoring with custom callback
    const cancelErrorMonitoring = window.lexi.utils.handleChatbotErrors(
      targetBotId,
      () => {
        // Custom error callback for controlChatbot
        if (hasRun) return;
        hasRun = true;

        // Remove the filter on error
        if (typeof MwaiAPI.removeFilter === "function") {
          MwaiAPI.removeFilter("ai.reply", handleReply);
        }
      }
    );

    // Helper function to process the chatbot's reply
    const handleReply = (reply, args) => {
      // IMPORTANT: Check if this reply is from our target chatbot
      // The ai.reply filter fires for ALL chatbots, so we must filter by botId
      if (args && args.botId && targetBotId && args.botId !== targetBotId) {
        // This reply is from a different bot, ignore it
        return reply;
      }

      // Prevent duplicate execution
      if (hasRun) {
        return reply;
      }
      hasRun = true;

      // Cancel error monitoring
      cancelErrorMonitoring();

      // Remove the filter immediately to prevent any further calls
      if (typeof MwaiAPI.removeFilter === "function") {
        MwaiAPI.removeFilter("ai.reply", handleReply);
      }

      // Re-enable all AI buttons when process completes
      if (typeof window.lexi.utils.enableElement === "function") {
        window.lexi.utils.enableElement(".lx-ai-btn");
      }

      // Dispatch a custom "response" event when a reply is received
      try {
        const responseEvent = new CustomEvent("lexi:ai:response", {
          detail: {
            botId: targetBotId,
            reply,
          },
        });
        window.dispatchEvent(responseEvent);
      } catch (e) {
        // Fallback if CustomEvent isn't available
        console.warn("Unable to dispatch lexi:ai:response", e);
      }

      console.log("[LEXI] Chatbot reply ←", reply);
      if (callback && typeof callback === "function") {
        callback(reply); // Pass the reply to the callback
      }
      console.log("Chatbot response processed successfully");

      return reply; // Return the reply unmodified
    };

    // Add a filter to intercept and handle the chatbot's reply
    MwaiAPI.addFilter("ai.reply", handleReply);
  }

  // Perform actions in logical order
  if (shouldClear) chatbot.clear(); // Clear first if requested
  if (shouldOpen) chatbot.open(); // Then open if needed
  if (messageText) {
    // Wrap system messages in special HTML tags
    const finalMessage = isSystem
      ? `<p class="lx-system">${messageText}</p>`
      : messageText;

    // Add a small delay before sending to ensure filters are properly set
    setTimeout(() => {
      // Dispatch a custom "request" event just before asking
      try {
        const requestEvent = new CustomEvent("lexi:ai:request", {
          detail: {
            botId: chatbotId || chatbot?.id || null,
            message: messageText,
            isSystem,
            sendImmediately: !!sendImmediately,
          },
        });
        window.dispatchEvent(requestEvent);
      } catch (e) {
        console.warn("Unable to dispatch lexi:ai:request", e);
      }

      console.log("[LEXI] Prompt →", finalMessage);
      chatbot.ask(finalMessage, sendImmediately);
    }, 100);
  }

  return true;
};

// Handles chatbot errors for calls that are not sent via controlChatbot
// Can be used for any chatbot
// @param {string} targetBotId - The ID of the chatbot to monitor for errors
// @param {function|null} onError - Optional callback function to execute when an error occurs
// @returns {function} cleanup - Function to cancel error monitoring and cleanup timers
window.lexi.utils.handleChatbotErrors = function handleChatbotErrors(
  targetBotId,
  onError = null
) {
  // Flag to ensure error handler runs only once
  let hasRun = false;

  // Store timeout IDs for cleanup
  let errorCheckTimeout = null;
  let blankCheckTimeout = null;
  let timeoutCheckTimeout = null;

  // Helper function to clean up all timers
  const cleanupTimers = () => {
    if (errorCheckTimeout) clearTimeout(errorCheckTimeout);
    if (blankCheckTimeout) clearTimeout(blankCheckTimeout);
    if (timeoutCheckTimeout) clearTimeout(timeoutCheckTimeout);
  };

  // Helper function to get the last reply element
  const getLastReply = () => {
    const chatbotContainer = document.getElementById(
      `mwai-chatbot-${targetBotId}`
    );
    if (!chatbotContainer) return null;
    const replies = chatbotContainer.querySelectorAll(".mwai-reply");
    return replies.length > 0 ? replies[replies.length - 1] : null;
  };

  // Helper function to sanitize error messages (replace AI provider names)
  const sanitizeErrorMessage = (message) => {
    if (!message) return message;

    // Replace provider names (case-insensitive)
    let sanitized = message
      .replace(/Google|Anthropic|OpenAI|OpenRouter/gi, "LexiBot")
      .replace(/GPT|Claude|Flash|Gemini/gi, "Lexi");

    return sanitized;
  };

  // Helper function to make error messages user-friendly
  const getUserFriendlyError = (technicalError) => {
    const sanitized = sanitizeErrorMessage(technicalError);

    // Map technical errors to user-friendly messages
    if (sanitized.includes("No response received")) {
      return "We didn't receive a response. Please try again.";
    }
    if (sanitized.includes("not from AI")) {
      return "There was an issue processing your request. Please try again.";
    }
    if (sanitized.includes("blank")) {
      return "We received an empty response. Please try again.";
    }
    if (sanitized.includes("Timeout")) {
      return "Request timed out. Please check your connection and try again.";
    }

    // For other errors, return sanitized version
    return sanitized.replace(/Chatbot error \(Case \d\):\s*/i, "");
  };

  // Helper function to handle errors and cleanup
  const handleError = (errorMessage) => {
    if (hasRun) return;
    hasRun = true;

    console.error(errorMessage);
    cleanupTimers();

    // Re-enable all AI buttons on error
    if (typeof window.lexi.utils.enableElement === "function") {
      window.lexi.utils.enableElement(".lx-ai-btn");
    }

    // Hide loading animation on error
    window.lexi.utils.loadingAnimation(false);

    const blockedRequestCode =
      window.lexi?.tracking?.consumeBlockedRequestToast?.() || null;

    if (blockedRequestCode) {
      console.warn(
        `[LEXI] Suppressed generic chatbot notification after handled blocked request: ${blockedRequestCode}`
      );

      if (onError && typeof onError === "function") {
        try {
          onError({
            errorMessage,
            userFriendlyError: getUserFriendlyError(errorMessage),
            botId: targetBotId,
            blockedRequestCode,
            suppressed: true,
          });
        } catch (err) {
          console.error("Error executing custom error callback:", err);
        }
      }

      return;
    }

    // Display user-friendly error notification
    if (typeof window.lexi.utils.notification === "function") {
      window.lexi.utils.notification({
        state: "error",
        title: "Unable to Process Request",
        content: getUserFriendlyError(errorMessage),
        duration: 0,
        dismissible: true,
      });
    }

    // Execute custom error callback if provided
    if (onError && typeof onError === "function") {
      try {
        onError({
          errorMessage,
          userFriendlyError: getUserFriendlyError(errorMessage),
          botId: targetBotId,
        });
      } catch (err) {
        console.error("Error executing custom error callback:", err);
      }
    }
  };

  // Case 1: Check for error element after 2 seconds
  errorCheckTimeout = setTimeout(() => {
    const lastReply = getLastReply();
    if (lastReply && lastReply.classList.contains("mwai-error")) {
      const errorText = lastReply.querySelector(".mwai-text");
      const errorMsg = errorText
        ? errorText.textContent.trim()
        : "Unknown error";
      handleError(`Chatbot error (Case 1): ${errorMsg}`);
    }
  }, 2000);

  // Helper function to handle successful replies
  const handleSuccess = () => {
    if (hasRun) return;
    hasRun = true;

    console.log("Chatbot reply received successfully");
    cleanupTimers();

    // Re-enable all AI buttons on success
    if (typeof window.lexi.utils.enableElement === "function") {
      window.lexi.utils.enableElement(".lx-ai-btn");
    }

    // Hide loading animation on success
    window.lexi.utils.loadingAnimation(false);
  };

  // Case 2: Check for blank or non-AI response after 5 seconds
  blankCheckTimeout = setTimeout(() => {
    if (hasRun) return; // Skip if already handled

    const lastReply = getLastReply();
    if (!lastReply) {
      handleError(
        "Chatbot error (Case 2): No response received after 10 seconds"
      );
      return;
    }

    const isAIReply = lastReply.classList.contains("mwai-ai");
    if (!isAIReply) {
      handleError(
        "Chatbot error (Case 2): Last reply is not from AI after 10 seconds"
      );
      return;
    }

    const textElement = lastReply.querySelector(".mwai-text");
    const textContent = textElement ? textElement.textContent.trim() : "";
    if (!textContent) {
      handleError(
        "Chatbot error (Case 2): AI response is blank after 10 seconds"
      );
      return;
    }

    // If all checks pass, it's a success
    handleSuccess();
  }, 10000);

  // Case 3: Check for timeout after 120 seconds
  // Temporarily disabled
  // timeoutCheckTimeout = setTimeout(() => {
  //   if (hasRun) return; // Skip if already handled
  //   handleError(
  //     "Chatbot error (Case 3): Timeout - no response received after 120 seconds"
  //   );
  // }, 120000);

  // Return cleanup function to cancel error monitoring
  return cleanupTimers;
};
