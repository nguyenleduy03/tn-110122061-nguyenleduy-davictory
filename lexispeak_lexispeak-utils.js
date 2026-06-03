/**
 * AIETTS Microphone Control (window.lexi.speak.mic)
 *
 * Enables global microphone recording and sending audio to chatbot.
 *
 * Example usage:
 *   window.lexi.speak.mic.toggleMic("on", botId, { language: "en" });  // Start recording
 *   window.lexi.speak.mic.toggleMic("off", botId, { language: "en" }); // Stop and send audio
 */
window.lexi = window.lexi || {};
window.lexi.speak = window.lexi.speak || {};
window.lexi.speak.botId = window.lexi.speak.botId || {};
window.lexi.speak.icons = window.lexi.speak.icons || {};

window.lexi.speak.botId.main = "lexispeak-main";
window.lexi.speak.botId.assistant = "lexispeak-assistant";
window.lexi.speak.botId.system = "lexispeak-system";

window.lexi.speak.icons.render = function (root = document) {
  if (!window.lexiLucide?.render || !root) {
    return;
  }

  window.lexiLucide.render(root);
};

window.lexi.speak.mic = window.lexi.speak.mic || {
  botId: "default",
  micManual: true,
  micRecorder: null,
  micChunks: [],
  micStream: null,
  micMaxDurationTimer: null,
  micMaxDurationMs: 2 * 60 * 1000, // 2 minutes
};

// Toggle microphone on/off
window.lexi.speak.mic.toggleMic = async function (state, botId, botSettings) {
  const mic = window.lexi.speak.mic;
  const microphone = jQuery(".mwai-microphone");
  const mediaEls = Array.from(document.querySelectorAll("audio,video"));

  if (state === "on") {
    fadeVolume(mediaEls, 0, 300);

    if (mic.micRecorder?.state === "recording") return;

    try {
      mic.micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      mic.micRecorder = new MediaRecorder(mic.micStream);
      mic.micChunks = [];

      mic.micRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) mic.micChunks.push(e.data);
      };

      mic.micRecorder.start();
      window.lexi.utils.playSound("voice_record_start");
      window.lexi.speak.orb.setVoiceOrbState("listening");
      microphone.attr("active", "true");

      // Auto-stop after max duration
      clearTimeout(mic.micMaxDurationTimer);
      mic.micMaxDurationTimer = setTimeout(() => {
        mic.toggleMic("off", botId, botSettings);
        mic.ptt?.setPTTState("sending");
      }, mic.micMaxDurationMs);
    } catch (err) {
      console.error("Mic start error:", err);
    }
  } else if (state === "off") {
    fadeVolume(mediaEls, 1.0, 2500);

    if (mic.micRecorder?.state !== "recording") return;

    window.lexi.utils.playSound("voice_record_stop");
    // Disable PTT to avoid conflicts in API calls
    window.lexi.speak.ptt.disablePTT();
    mic.micRecorder.onstop = async () => {
      microphone.attr("active", "false");

      const audioBlob = new Blob(mic.micChunks, { type: "audio/mp3" });
      mic.micChunks = [];

      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("botId", botId);
      formData.append(
        "language",
        botSettings.language || aiettsSettings.language || ""
      );

      try {
        const response = await fetch(
          aiettsSettings.root + "aietts/v1/whisper",
          {
            method: "POST",
            headers: { "X-WP-Nonce": aiettsSettings.rest_nonce },
            body: formData,
          }
        );

        const text = await response.text();
        if (text && text !== '""') {
          const bot = mic.getChatbot(botId) ?? MwaiAPI.getChatbot();
          if (bot) bot.ask(JSON.parse(text), true);

          window.lexi.utils.handleChatbotErrors(
            window.lexi.speak.botId.main,
            () => {
              window.lexi.utils.playSound("ai_speech_end");
              window.lexi.speak.ptt.setPTTState("idle");
              window.lexi.speak.orb.setVoiceOrbState("idle");
              window.lexi.speak.ptt.showPTT(true);
              window.lexi.speak.ptt.enablePTT(true);
            }
          );

          console.log("[Lexi] Sent message after STT: play send sound");
          window.lexi.utils.playSound("message_send");
          window.lexi.speak.ptt.setPTTState("processing");
          window.lexi.speak.orb.setVoiceOrbState("processing");
        }
      } catch (error) {
        console.error("Error sending audio:", error);
      }

      // Cleanup
      mic.micStream?.getTracks().forEach((track) => track.stop());
      mic.micStream = null;
      mic.micRecorder = null;
    };

    mic.micRecorder.stop();
    clearTimeout(mic.micMaxDurationTimer);
    mic.micMaxDurationTimer = null;
  }
};

// Get chatbot by ID or customId
window.lexi.speak.mic.getChatbot = function (id) {
  const parsedId = isNaN(id) ? id : parseInt(id, 10);
  return (
    MwaiAPI.chatbots.find(
      (chatbot) => chatbot.botId === parsedId || chatbot.customId === parsedId
    ) || null
  );
};

// Fade audio/video element volumes
function fadeVolume(elements, targetVolume, duration = 300) {
  elements.forEach((el) => {
    if (typeof el.volume !== "number") return;

    const startVolume = el.volume;
    const step = (targetVolume - startVolume) / (duration / 20);
    let current = startVolume;

    const interval = setInterval(() => {
      current += step;
      el.volume = Math.max(0, Math.min(1, current));

      if (
        (step > 0 && el.volume >= targetVolume) ||
        (step < 0 && el.volume <= targetVolume)
      ) {
        el.volume = targetVolume;
        el.muted = targetVolume === 0;
        clearInterval(interval);
      }
    }, 20);
  });
}
