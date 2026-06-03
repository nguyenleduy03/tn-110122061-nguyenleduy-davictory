/**
 * Usage Example:
 *
 * // Add a question card
 * window.lexi.speak.conversation.addQuestion({
 *   id: '1',
 *   number: 1,
 *   examinerName: 'Examiner',
 *   text: 'What is your name?'
 * });
 *
 * // Add an answer card
 * window.lexi.speak.conversation.addAnswer({
 *   id: '1',
 *   questionId: '1',
 *   questionNumber: 1,
 *   candidateName: 'John Doe',
 *   text: 'My name is John Doe.',
 *   attempt: 1
 * });
 *
 * // Add a hint sub-card to question
 * window.lexi.speak.conversation.addSubCard('hint', '1', {
 *   id: 'hint_1',
 *   text: 'Try to answer in full sentences.'
 * });
 *
 * // Add a sample sub-card to question
 * window.lexi.speak.conversation.addSubCard('sample', '1', {
 *   id: 'sample_1',
 *   text: 'My name is John Doe.'
 * });
 *
 * // Add an analysis sub-card to answer
 * window.lexi.speak.conversation.addSubCard('analysis', '1', {
 *   id: 'analysis_1',
 *   scores: { Fluency: '8', Grammar: '7' },
 *   feedback: 'Good answer, but watch your grammar.',
 *   suggestions: ['Use more complex sentences', 'Check verb agreement']
 * });
 */
/**
 * Conversation Component Logic
 * Handles the interaction and state of the conversation timeline.
 */

(function () {
  // Ensure namespace exists
  window.lexi = window.lexi || {};
  window.lexi.speak = window.lexi.speak || {};

  class ConversationManager {
    constructor() {
      this.timeline = document.getElementById("lx-conversation-timeline");
      this.eventListeners = {};
      this.activeScoringSignature = null;
      this.lockedScoringSignature = null;
    }

    _renderLucideIcons(root = document) {
      if (window.lexi?.speak?.icons?.render) {
        window.lexi.speak.icons.render(root);
      }
    }

    _iconMarkup(name, className = "") {
      const classes = className ? ` class="${className}"` : "";
      return `<i data-lucide="${name}"${classes} aria-hidden="true"></i>`;
    }

    _escapeHtml(text) {
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    /**
     * Initialize the component
     */
    init() {
      console.log("Conversation component initialized");
      this._attachHeaderClickHandlers();
      this._initEmptyStateLink();
      this._initFooterButtons();
      this._initScoringStateListeners();
      this._updateDownloadButtonState();
      this._updateCheckScoreButtonState();
    }

    _getScoringInputSignature() {
      if (!this.timeline) return "";

      return Array.from(this.timeline.querySelectorAll(".lx-conv-card--answer"))
        .map((card) => {
          const questionId = card.getAttribute("data-question-id") || "";
          const answerId = card.getAttribute("data-answer-id") || "";
          const text = (card.querySelector(".lx-conv-card__txt")?.textContent || "").trim();
          return `${questionId}:${answerId}:${text}`;
        })
        .join("|");
    }

    _initScoringStateListeners() {
      document.addEventListener("lexispeak:scoring-start", () => {
        this.activeScoringSignature = this._getScoringInputSignature();
      });

      document.addEventListener("lexispeak:scoring-complete", () => {
        this.lockedScoringSignature = this.activeScoringSignature || this._getScoringInputSignature();
        this.activeScoringSignature = null;
        this._updateCheckScoreButtonState();
      });

      document.addEventListener("lexispeak:scoring-error", () => {
        this.activeScoringSignature = null;
        this._updateCheckScoreButtonState();
      });
    }

    /**
     * Check if the conversation timeline is empty (no question/answer cards)
     * @returns {boolean} - true if empty, false if has content
     */
    _isTimelineEmpty() {
      if (!this.timeline) return true;

      // Check if there are any question or answer cards
      const questionCards = this.timeline.querySelectorAll(
        ".lx-conv-card--question"
      );
      const answerCards = this.timeline.querySelectorAll(
        ".lx-conv-card--answer"
      );

      return questionCards.length === 0 && answerCards.length === 0;
    }

    /**
     * Update the check score button state.
     * Enables the button once 5 unique question IDs each have at least one answer.
     */
    _updateCheckScoreButtonState() {
      const btn = document.getElementById("lx-conv-check-score-btn");
      if (!btn) return;

      const answerCards = this.timeline
        ? this.timeline.querySelectorAll(".lx-conv-card--answer")
        : [];

      const answeredIds = new Set();
      answerCards.forEach((card) => {
        const qId = card.getAttribute("data-question-id");
        if (qId) answeredIds.add(qId);
      });

      const MIN_QUESTIONS = 2;
      const currentSignature = this._getScoringInputSignature();
      const isLockedForCurrentInput =
        Boolean(this.lockedScoringSignature) &&
        this.lockedScoringSignature === currentSignature;

      if (answeredIds.size >= MIN_QUESTIONS && !isLockedForCurrentInput) {
        if (typeof window.lexi?.utils?.enableElement === "function") {
          // force=true bypasses data-disabled-locked
          window.lexi.utils.enableElement("#lx-conv-check-score-btn", true);
        }
        btn.removeAttribute("data-tooltip");
      } else if (isLockedForCurrentInput) {
        btn.setAttribute("data-tooltip", "Score already checked. Add a new answer to run Check Score again.");
        if (typeof window.lexi?.utils?.disableElement === "function") {
          window.lexi.utils.disableElement("#lx-conv-check-score-btn", true);
        }
      } else {
        btn.setAttribute("data-tooltip", "Answer at least 2 questions to check your score. The more you answer, the more accurate your score will be.");
        if (typeof window.lexi?.utils?.disableElement === "function") {
          window.lexi.utils.disableElement("#lx-conv-check-score-btn", true);
        }
      }
    }

    /**
     * Update the download button state based on timeline content
     */
    _updateDownloadButtonState() {
      const isEmpty = this._isTimelineEmpty();
      const downloadBtn = document.getElementById("lx-conv-download-btn");

      if (!downloadBtn) return;

      if (isEmpty) {
        // Hide download button when timeline is empty
        if (typeof window.lexi.utils.disableElement === "function") {
          window.lexi.utils.disableElement("#lx-conv-download-btn", true);
        }
        downloadBtn.style.display = "none";
      } else {
        // Show and enable download button when timeline has content
        if (typeof window.lexi.utils.enableElement === "function") {
          window.lexi.utils.enableElement("#lx-conv-download-btn", true);
        }
        downloadBtn.style.display = "";
      }
    }

    /**
     * Initialize the empty state "Select a topic" link
     */
    _initEmptyStateLink() {
      const selectTopicLink = document.getElementById("lx-select-topic-link");
      if (selectTopicLink) {
        selectTopicLink.addEventListener("click", (e) => {
          e.preventDefault();
          this._trigger("topic:select-requested");

          // Call the custom handler if set
          if (this.onTopicSelectRequested) {
            this.onTopicSelectRequested();
          }
          // Open side panel 1
          if (
            window.lexi &&
            window.lexi.utils &&
            typeof window.lexi.utils.toggleSidePanel === "function"
          ) {
            window.lexi.utils.toggleSidePanel("open", "1");
          }
        });
      }
    }

    /**
     * Set a custom handler for when "Select a topic" is clicked
     * @param {Function} handler - Function to call when topic selection is requested
     */
    setTopicSelectHandler(handler) {
      this.onTopicSelectRequested = handler;
    }

    /**
     * Initialize the sticky footer buttons
     */
    _initFooterButtons() {
      const downloadBtn = document.getElementById("lx-conv-download-btn");
      const checkScoreBtn = document.getElementById("lx-conv-check-score-btn");

      if (downloadBtn) {
        downloadBtn.addEventListener("click", () => {
          this._handleDownload();
        });
      }

      if (checkScoreBtn) {
        checkScoreBtn.addEventListener("click", () => {
          this._handleCheckScore();
        });
      }
    }

    /**
     * Handle Download button click
     */
    _handleDownload() {
      console.log("[LEXI] Download button clicked");
      this._trigger("footer:download-clicked");

      // Call custom handler if set
      if (this.onDownloadClick) {
        this.onDownloadClick();
      } else {
        // Generate filename with format: YY-MM-DD_Hour-Minute_LexiSpeak_Q&A
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hour = String(now.getHours()).padStart(2, "0");
        const minute = String(now.getMinutes()).padStart(2, "0");
        const filename = `${year}-${month}-${day}_${hour}-${minute}_LexiSpeak_Q&A`;

        // Export to HTML and then to DOCX
        const htmlContent = this.exportToHTML();

        if (htmlContent && window.lexi?.utils?.exportToDocx) {
          window.lexi.utils.exportToDocx(htmlContent, "LexiBot", filename);
          console.log("[LEXI] Exporting conversation to DOCX");
        } else {
          console.error(
            "[LEXI] Export function not available or no content to export"
          );
        }
      }
    }

    /**
     * Handle Check Score button click
     */
    _handleCheckScore() {
      console.log("[LEXI] Check Score button clicked");
      this._trigger("footer:check-score-clicked");

      const SCORING_TAB_INDEX = "3";
      if (window.lexi?.utils?.toggleSidePanel) {
        window.lexi.utils.toggleSidePanel("open", SCORING_TAB_INDEX);
      } else {
        const scoringTabBtn = document.querySelector(
          `[data-tabs-target="${SCORING_TAB_INDEX}"]`
        );
        if (scoringTabBtn) {
          scoringTabBtn.click();
        }
      }

      const shouldExpand =
        typeof window.lexi?.utils?.shouldUseExpandedSidePanel === "function"
          ? window.lexi.utils.shouldUseExpandedSidePanel()
          : window.matchMedia("(min-width: 768px)").matches;
      if (shouldExpand && window.lexi?.utils?.setSidePanelExpanded) {
        window.lexi.utils.setSidePanelExpanded(true);
      } else if (window.lexi?.utils?.setSidePanelExpanded) {
        window.lexi.utils.setSidePanelExpanded(false);
      }

      if (this.onCheckScoreClick) {
        this.onCheckScoreClick();
        return;
      }

      // Run all scoring phases via the unified scoring orchestrator.
      if (window.lexi?.speak?.scoring?.run) {
        window.lexi.speak.scoring.run();
      }
    }

    /**
     * Set a custom handler for Download button
     * @param {Function} handler - Function to call when download is clicked
     */
    setDownloadHandler(handler) {
      this.onDownloadClick = handler;
    }

    /**
     * Set a custom handler for Check Score button
     * @param {Function} handler - Function to call when check score is clicked
     */
    setCheckScoreHandler(handler) {
      this.onCheckScoreClick = handler;
    }

    /**
     * Attach click handlers to all card headers
     */
    _attachHeaderClickHandlers() {
      // Use event delegation for dynamically added cards
      if (this.timeline) {
        this.timeline.addEventListener("click", (e) => {
          // Find if clicked element is within a header
          const header = e.target.closest(
            ".lx-conv-card__hdr, .lx-conv-sub__hdr"
          );
          if (!header) return;

          // Don't toggle if clicking on a button
          if (e.target.closest("button")) return;

          // Find the card
          const card = header.closest(".lx-conv-card");
          if (!card) return;

          // Get the card ID (DOM ID)
          const cardId = card.id;

          if (cardId) {
            this.toggleCard(cardId);
          }
        });
      }
    }

    /**
     * Trigger an event
     */
    _trigger(eventName, data) {
      const event = new CustomEvent(eventName, { detail: data });
      document.dispatchEvent(event);
      if (this.eventListeners[eventName]) {
        this.eventListeners[eventName].forEach((cb) => cb(data));
      }
    }

    /**
     * Subscribe to an event
     */
    on(eventName, callback) {
      if (!this.eventListeners[eventName]) {
        this.eventListeners[eventName] = [];
      }
      this.eventListeners[eventName].push(callback);
    }

    /**
     * Add a new question card
     * @param {Object} data - Question data
     */
    addQuestion(data) {
      const cardId = `q${data.id}`;

      // Check if card already exists
      const existingCard = document.getElementById(cardId);

      if (existingCard) {
        // Update existing card content
        const cardContent = existingCard.querySelector(".lx-conv-card__cnt");

        // Clear and rebuild the content
        cardContent.innerHTML = `
          <p class="lx-conv-card__txt">${data.text}</p>
          <div class="lx-conv-card__actions">
            <button class="lx-conv-btn lx-conv-btn--secondary lx-ai-btn" onclick="window.lexi.speak.conversation.showHint('${data.id}')">
              ${this._iconMarkup("lightbulb")}
              Show Hint
            </button>
            <button class="lx-conv-btn lx-conv-btn--secondary lx-ai-btn" onclick="window.lexi.speak.conversation.showSample('${data.id}')">
              ${this._iconMarkup("sparkles")}
              Show Sample
            </button>
          </div>
        `;
        this._renderLucideIcons(cardContent);
        return;
      }

      // Collapse all previous cards
      this._collapseAll();

      const html = `
                <div class="lx-conv-card lx-conv-card--question" data-question-id="${
                  data.id
                }" data-card-type="question" id="${cardId}">
                    <div class="lx-conv-card__dot"></div>
                    <div class="lx-conv-card__body">
                        <div class="lx-conv-card__hdr">
                            <div class="lx-conv-card__hdr-left">
                                <span class="lx-conv-card__num">Q${
                                  data.number || ""
                                }</span>
                                <span class="lx-conv-card__name">${
                                  data.examinerName || "Examiner"
                                }</span>
                            </div>
                            <div class="lx-conv-card__hdr-right">
                                <button class="lx-conv-btn lx-conv-btn--icon" aria-label="Play audio">
                                    ${this._iconMarkup("play")}
                                </button>
                                <button class="lx-conv-btn lx-conv-card__toggle" aria-label="Collapse" onclick="window.lexi.speak.conversation.toggleCard('q${
                                  data.id
                                }')">
                                    ${this._iconMarkup("chevron-up")}
                                </button>
                            </div>
                        </div>
                        <div class="lx-conv-card__cnt">
                            <p class="lx-conv-card__txt">${data.text}</p>
                            <div class="lx-conv-card__actions">
                                <button class="lx-conv-btn lx-conv-btn--secondary lx-ai-btn" onclick="window.lexi.speak.conversation.showHint('${
                                  data.id
                                }')">
                                    ${this._iconMarkup("lightbulb")}
                                    Show Hint
                                </button>
                                <button class="lx-conv-btn lx-conv-btn--secondary lx-ai-btn" onclick="window.lexi.speak.conversation.showSample('${
                                  data.id
                                }')">
                                    ${this._iconMarkup("sparkles")}
                                    Show Sample
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      this.timeline.insertAdjacentHTML("beforeend", html);

      // Scroll to new card
      const newCard = document.getElementById(cardId);
      if (newCard) {
        this._renderLucideIcons(newCard);
        newCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // Update download button state
      this._updateDownloadButtonState();
      this._updateCheckScoreButtonState();

      this._trigger("question:added", { id: data.id, data });
    }

    /**
     * Add a new answer card
     * @param {Object} data - Answer data
     */
    addAnswer(data) {
      const cardId = `a${data.id}`;
      const canRefineAnswer = data.text && data.text.length >= 100;

      const html = `
                <div class="lx-conv-card lx-conv-card--answer" data-answer-id="${
                  data.id
                }" data-question-id="${
        data.questionId
      }" data-card-type="answer" id="${cardId}">
                    <div class="lx-conv-card__dot"></div>
                    <div class="lx-conv-card__body">
                        <div class="lx-conv-card__hdr">
                            <div class="lx-conv-card__hdr-left">
                                <div class="lx-conv-card__meta">
                                    <span class="lx-conv-card__num">Q${
                                      data.questionNumber || ""
                                    }</span>
                                    <span class="lx-conv-card__meta-sep">•</span>
                                    <span>Attempt ${data.attempt || 1}</span>
                                    <span class="lx-conv-card__meta-sep">•</span>
                                    <span class="lx-conv-card__name">${
                                      data.candidateName || "You"
                                    }</span>
                                </div>
                            </div>
                            <div class="lx-conv-card__hdr-actions">
                                <button class="lx-conv-btn lx-conv-card__toggle" aria-label="Collapse" onclick="window.lexi.speak.conversation.toggleCard('a${
                                  data.id
                                }')">
                                    ${this._iconMarkup("chevron-up")}
                                </button>
                                <button class="lx-conv-btn lx-conv-card__remove" aria-label="Remove" onclick="window.lexi.speak.conversation.removeAnswer('${
                                  data.id
                                }')">
                                    ${this._iconMarkup("x")}
                                </button>
                            </div>
                        </div>
                        <div class="lx-conv-card__cnt">
                            <div class="lx-conv-card__audio">
                                <button class="lx-conv-btn lx-conv-btn--icon lx-conv-audio__btn">
                                    ${this._iconMarkup("play")}
                                </button>
                                <div class="lx-conv-audio__progress">
                                    <div class="lx-conv-audio__progress-bar" style="width: 0%"></div>
                                </div>
                                <span class="lx-conv-audio__time">0:00</span>
                            </div>
                            <p class="lx-conv-card__txt">${data.text}</p>
                            <div class="lx-conv-card__actions">
                                <button id="${this._getAnswerActionButtonId(
                                  "correct",
                                  data.id
                                )}" class="lx-conv-btn lx-conv-btn--secondary lx-ai-btn" onclick="window.lexi.speak.conversation.showCorrect('${
        data.id
      }')">
                                    ${this._iconMarkup("check")}
                                    Correct
                                </button>
                                <button id="${this._getAnswerActionButtonId(
                                  "improve",
                                  data.id
                                )}" class="lx-conv-btn lx-conv-btn--secondary lx-ai-btn" onclick="window.lexi.speak.conversation.showImprove('${
        data.id
      }')">
                                    ${this._iconMarkup("sparkles")}
                                    Improve
                                </button>
                                <button id="${this._getAnswerActionButtonId(
                                  "analysis",
                                  data.id
                                )}" class="lx-conv-btn lx-conv-btn--secondary lx-ai-btn" onclick="window.lexi.speak.conversation.showAnalysis('${
        data.id
      }')">
                                    ${this._iconMarkup("square-chart-gantt")}
                                    Analyze
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

      // Find the question card or the last card related to the question to append after
      // For simplicity, appending to end of timeline, but in real app might need precise positioning
      // Assuming chronological order, appending to end is usually correct for new answers
      this.timeline.insertAdjacentHTML("beforeend", html);

      const newCard = document.getElementById(cardId);
      if (newCard) {
        this._renderLucideIcons(newCard);
        newCard.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Disable answer refinement buttons if the answer is too short
      if (!canRefineAnswer) {
        ["correct", "improve", "analysis"].forEach((actionType) => {
          this._disableAnswerActionButton(
            data.id,
            actionType,
            "Answer is too short (minimum 100 characters)"
          );
        });
      }

      // Update download button state
      this._updateDownloadButtonState();

      // Update check score button state
      this._updateCheckScoreButtonState();

      this._trigger("answer:added", { id: data.id, data });
    }

    /**
     * Add a sub-card (Hint, Sample, Analysis)
     */
    addSubCard(type, parentId, data) {
      const subId = data.id || `${type}_${parentId}_${Date.now()}`;
      const cardId = `card-${subId}`;

      // Check if already exists
      if (document.querySelector(`[data-sub-id="${subId}"]`)) {
        this.showCard(subId);
        return;
      }

      let contentHtml = "";
      let icon = "";
      let title = "";
      let extraClass = "";
      let showRefinementToggle = false;

      if (type === "hint") {
        icon = "lightbulb";
        title = "Hint";
        extraClass = "lx-conv-card--hint";
        // Use data.html if available, otherwise fall back to data.text
        const content = data.html || data.text || "";
        contentHtml = `<div class="lx-conv-sub__txt">${content}</div>`;
      } else if (type === "sample") {
        icon = "sparkles";
        title = "Sample Answer";
        extraClass = "lx-conv-card--sample";
        // Use data.html if available, otherwise fall back to data.text
        const content = data.html || data.text || "";
        contentHtml = `
                    <div class="lx-conv-card__audio">
                        <button class="lx-conv-btn lx-conv-btn--icon lx-conv-audio__btn">${this._iconMarkup("play")}</button>
                        <div class="lx-conv-audio__progress"><div class="lx-conv-audio__progress-bar"></div></div>
                        <span class="lx-conv-audio__time">--:--</span>
                    </div>
                    <div class="lx-conv-sub__txt">${content}</div>
                `;
      } else if (type === "analysis") {
        icon = "square-chart-gantt";
        title = "Analysis";
        extraClass = "lx-conv-card--analysis";

        // Check if we have HTML content (from AI response) or structured data
        if (data.html || (data.feedback && data.feedback.includes("<"))) {
          // Use HTML content directly
          const content = data.html || data.feedback || "";
          contentHtml = `<div class="lx-conv-sub__txt">${content}</div>`;
        } else {
          // Use structured format
          const scoresHtml = Object.entries(data.scores || {})
            .map(
              ([key, val]) => `
                    <div class="lx-conv-score">
                        <div class="lx-conv-score__label">${key}</div>
                        <div class="lx-conv-score__val">${val}</div>
                    </div>
                `
            )
            .join("");

          const suggestionsHtml = (data.suggestions || [])
            .map((s) => `<li>${s}</li>`)
            .join("");

          contentHtml = `
                    <div class="lx-conv-analysis__scores">${scoresHtml}</div>
                    <div class="lx-conv-analysis__feedback">
                        <div class="lx-conv-analysis__label">Feedback</div>
                        <p class="lx-conv-sub__txt">${data.feedback || ""}</p>
                    </div>
                    <div class="lx-conv-analysis__label">Suggestions</div>
                    <ul class="lx-conv-analysis__suggestions">${suggestionsHtml}</ul>
                `;
        }
      } else if (type === "correct" || type === "improve") {
        icon = type === "correct" ? "check" : "sparkles";
        title = type === "correct" ? "Corrected Answer" : "Improved Answer";
        extraClass = type === "correct" ? "lx-conv-card--correct" : "lx-conv-card--improve";

        const diffResult = this._compareRefinementTexts(
          data.originalText || "",
          data.text || ""
        );
        showRefinementToggle = !diffResult.noMeaningfulChange;
        contentHtml = `
                    <div class="lx-conv-sub__txt lx-conv-refine__txt">
                        ${this._renderRefinementDiff(diffResult)}
                    </div>
                `;
      }

      const html = `
                <div class="lx-conv-card lx-conv-card--sub ${extraClass}" data-sub-id="${subId}" data-parent-id="${parentId}" data-type="${type}" data-card-type="sub" id="${cardId}">
                    <div class="lx-conv-card__dot"></div>
                    <div class="lx-conv-card__body">
                        <div class="lx-conv-sub__hdr">
                            <div class="lx-conv-sub__title">
                                ${this._iconMarkup(icon)}
                                ${title}
                            </div>
                            <div class="lx-conv-sub__hdr-actions">
                            ${
                              showRefinementToggle
                              ? `<button type="button" class="lx-conv-btn lx-conv-btn--toggle lx-conv-btn--refine-toggle" aria-label="Hide deleted diff" title="Click to hide/show deleted diff" aria-pressed="false" onclick="window.lexi.speak.conversation.toggleRefinementDiffVisibility('card-${subId}', this)">
                              ${this._iconMarkup("eye")}
                            </button>`
                              : ""
                            }
                                <button class="lx-conv-btn lx-conv-btn--toggle" onclick="window.lexi.speak.conversation.toggleCard('card-${subId}')">
                                    ${this._iconMarkup("chevron-up")}
                                </button>
                            </div>
                        </div>
                        <div class="lx-conv-sub__cnt">
                            ${contentHtml}
                        </div>
                    </div>
                </div>
            `;

      // Find parent card to insert after
      // If parent is question (hint/sample), insert after question or its existing sub-cards
      // If parent is answer (analysis), insert after answer

      // Determine the correct selector based on the type of sub-card
      let parentEl = null;
      if (type === "hint" || type === "sample") {
        // For hint and sample, parentId is a questionId
        parentEl = document.querySelector(
          `[data-question-id="${parentId}"][data-card-type="question"]`
        );
      } else if (
        type === "analysis" ||
        type === "correct" ||
        type === "improve"
      ) {
        // For answer refinements, parentId is an answerId
        parentEl = document.querySelector(
          `[data-answer-id="${parentId}"][data-card-type="answer"]`
        );
      }

      if (parentEl) {
        // We need to insert after the parent and any of its existing sub-cards
        // But for simplicity, let's just insert after the parent for now, or find the last sub-card of this parent
        let target = parentEl;
        let next = target.nextElementSibling;
        while (
          next &&
          next.classList.contains("lx-conv-card--sub") &&
          next.getAttribute("data-parent-id") === parentId
        ) {
          target = next;
          next = target.nextElementSibling;
        }
        target.insertAdjacentHTML("afterend", html);

        // Scroll to new sub card
        const newSubCard = document.getElementById(cardId);
        if (newSubCard) {
          this._renderLucideIcons(newSubCard);
          newSubCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }

      this._trigger("subcard:added", { id: subId, parentId, type, data });
    }

    removeAnswer(answerId) {
      const el = document.querySelector(`[data-answer-id="${answerId}"]`);
      if (el) {
        // Also remove any sub-cards (analysis) linked to this answer
        const subCards = document.querySelectorAll(
          `[data-parent-id="${answerId}"]`
        );
        subCards.forEach((card) => card.remove());
        el.remove();
        this._trigger("answer:removed", { id: answerId });
      }

      // Update download button state
      this._updateDownloadButtonState();
      this._updateCheckScoreButtonState();
    }

    removeSubCard(subId) {
      const el = document.querySelector(`[data-sub-id="${subId}"]`);
      if (el) {
        el.remove();
        this._trigger("subcard:removed", { id: subId });
      }
    }

    expandCard(cardId) {
      const el = this._getCardEl(cardId);
      if (el) {
        el.classList.remove("lx-conv-card--collapsed");

        // Remove preview attribute
        const headerEl = el.querySelector(
          ".lx-conv-card__hdr, .lx-conv-sub__hdr"
        );
        if (headerEl) {
          headerEl.removeAttribute("data-preview");
        }

        // If it's a question card, show its sub-cards
        if (el.dataset.cardType === "question") {
          const qId = el.dataset.questionId;
          const subCards = document.querySelectorAll(
            `[data-parent-id="${qId}"]`
          );
          subCards.forEach((sub) =>
            sub.classList.remove("lx-conv-card--hidden")
          );
        }

        // If it's an answer card, show its sub-cards
        if (el.dataset.cardType === "answer") {
          const aId = el.dataset.answerId;
          const subCards = document.querySelectorAll(
            `[data-parent-id="${aId}"]`
          );
          subCards.forEach((sub) =>
            sub.classList.remove("lx-conv-card--hidden")
          );
        }

        this._trigger("card:expanded", { id: cardId });
      }
    }

    collapseCard(cardId) {
      const el = this._getCardEl(cardId);
      if (el) {
        el.classList.add("lx-conv-card--collapsed");

        // Extract text preview and set it on the header
        const textEl = el.querySelector(
          ".lx-conv-card__txt, .lx-conv-sub__txt"
        );
        const headerEl = el.querySelector(
          ".lx-conv-card__hdr, .lx-conv-sub__hdr"
        );

        if (textEl && headerEl) {
          const previewText = textEl.textContent.trim();
          headerEl.setAttribute("data-preview", previewText);
        }

        // If it's a question card, hide its sub-cards
        if (el.dataset.cardType === "question") {
          const qId = el.dataset.questionId;
          const subCards = document.querySelectorAll(
            `[data-parent-id="${qId}"]`
          );
          subCards.forEach((sub) => sub.classList.add("lx-conv-card--hidden"));
        }
        // If it's an answer card, hide its analysis
        if (el.dataset.cardType === "answer") {
          const aId = el.dataset.answerId;
          const subCards = document.querySelectorAll(
            `[data-parent-id="${aId}"]`
          );
          subCards.forEach((sub) => sub.classList.add("lx-conv-card--hidden"));
        }

        this._trigger("card:collapsed", { id: cardId });
      }
    }

    toggleCard(cardId) {
      const el = this._getCardEl(cardId);
      if (el) {
        if (el.classList.contains("lx-conv-card--collapsed")) {
          this.expandCard(cardId);
        } else {
          this.collapseCard(cardId);
        }
      }
    }

    hideCard(cardId) {
      const el = this._getCardEl(cardId);
      if (el) {
        el.classList.add("lx-conv-card--hidden");
        this._trigger("card:hidden", { id: cardId });
      }
    }

    showCard(cardId) {
      const el = this._getCardEl(cardId);
      if (el) {
        el.classList.remove("lx-conv-card--hidden");
        this._trigger("card:shown", { id: cardId });
      }
    }

    /**
     * Get the last 3 answers from previous questions
     * Returns only the latest attempt for each question
     * @param {string} currentQuestionId - The current question ID to exclude
     * @returns {string} Formatted string of previous answers
     */
    _getLastThreeAnswers(currentQuestionId) {
      // Get all answer cards from the timeline
      const allAnswerCards = Array.from(
        this.timeline.querySelectorAll(".lx-conv-card--answer")
      );

      // Filter out answers for the current question
      const previousAnswers = allAnswerCards.filter(
        (card) => card.dataset.questionId !== currentQuestionId
      );

      // Group answers by question ID
      const answersByQuestion = {};
      previousAnswers.forEach((card) => {
        const questionId = card.dataset.questionId;
        const answerId = card.dataset.answerId;
        const answerText = card
          .querySelector(".lx-conv-card__txt")
          ?.textContent.trim();

        if (!answerText) return;

        // Store answer with its metadata
        if (!answersByQuestion[questionId]) {
          answersByQuestion[questionId] = [];
        }

        answersByQuestion[questionId].push({
          id: answerId,
          text: answerText,
          element: card,
        });
      });

      // Get the latest answer for each question (based on DOM order)
      const latestAnswers = Object.entries(answersByQuestion).map(
        ([questionId, answers]) => {
          // The last answer in the array is the latest (most recent in DOM)
          return answers[answers.length - 1];
        }
      );

      // Sort by DOM order and take the last 3
      latestAnswers.sort((a, b) => {
        const indexA = previousAnswers.indexOf(a.element);
        const indexB = previousAnswers.indexOf(b.element);
        return indexA - indexB;
      });

      const lastThree = latestAnswers.slice(-3);

      // Format as a string
      if (lastThree.length === 0) {
        return "No previous answers available.";
      }

      const formattedAnswers = lastThree
        .map((answer, index) => {
          return `${index + 1}: "${answer.text}"`;
        })
        .join(" | ");

      console.log("[LEXI] Last 3 answers:", formattedAnswers);
      return formattedAnswers;
    }

    _getAnswerActionButtonId(actionType, answerId) {
      if (actionType === "analysis") {
        return `lx-analyze-btn-${answerId}`;
      }

      return `lx-${actionType}-btn-${answerId}`;
    }

    _disableAnswerActionButton(answerId, actionType, tooltipMessage = "") {
      const buttonSelector = `#${this._getAnswerActionButtonId(
        actionType,
        answerId
      )}`;

      if (tooltipMessage && window.lexi?.utils?.tooltip) {
        window.lexi.utils.tooltip.add(buttonSelector, tooltipMessage);
      }

      if (window.lexi?.utils?.disableElement) {
        window.lexi.utils.disableElement(buttonSelector, true);
      }
    }

    _extractPlainTextFromAIReply(htmlReply) {
      if (!htmlReply) return "";

      const wrapper = document.createElement("div");
      wrapper.innerHTML = htmlReply;

      return (wrapper.innerText || wrapper.textContent || "")
        .replace(/\u00A0/g, " ")
        .trim();
    }

    _getAnswerActionContext(answerId) {
      const answerCard = document.querySelector(
        `[data-answer-id="${answerId}"][data-card-type="answer"]`
      );

      if (!answerCard) {
        console.error(`Answer card with ID ${answerId} not found`);
        return null;
      }

      const questionId = answerCard.getAttribute("data-question-id");
      if (!questionId) {
        console.error(`No question ID found for answer ${answerId}`);
        return null;
      }

      const questionCard = document.querySelector(
        `[data-question-id="${questionId}"][data-card-type="question"]`
      );
      if (!questionCard) {
        console.error(`Question card with ID ${questionId} not found`);
        return null;
      }

      const questionText = questionCard
        .querySelector(".lx-conv-card__txt")
        ?.textContent.trim();
      if (!questionText) {
        console.error(`No question text found for question ${questionId}`);
        return null;
      }

      const answerText = answerCard
        .querySelector(".lx-conv-card__txt")
        ?.textContent.trim();
      if (!answerText) {
        console.error(`No answer text found for answer ${answerId}`);
        return null;
      }

      return {
        answerCard,
        questionCard,
        questionId,
        questionText,
        answerText,
      };
    }

    _normalizeRefinementText(text) {
      return String(text || "").replace(/\s+/g, " ").trim();
    }

    _normalizeComparableRefinementText(text) {
      return this._normalizeRefinementText(text)
        .replace(/[\p{P}\p{S}\s]+/gu, "")
        .toLowerCase();
    }

    _tokenizeRefinementText(text) {
      const normalizedText = this._normalizeRefinementText(text);

      if (!normalizedText) return [];

      return (
        normalizedText.match(
          /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu
        ) || []
      );
    }

    _compareRefinementTexts(originalText, revisedText) {
      const originalComparable = this._normalizeComparableRefinementText(
        originalText
      );
      const revisedComparable = this._normalizeComparableRefinementText(
        revisedText
      );

      const originalTokens = this._tokenizeRefinementText(originalText);
      const revisedTokens = this._tokenizeRefinementText(revisedText);

      if (originalComparable === revisedComparable) {
        return {
          noMeaningfulChange: true,
          originalTokens,
          revisedTokens,
          segments: [],
        };
      }

      return {
        noMeaningfulChange: false,
        originalTokens,
        revisedTokens,
        segments: this._buildTokenDiff(originalTokens, revisedTokens),
      };
    }

    _buildTokenDiff(originalTokens, revisedTokens) {
      const originalLength = originalTokens.length;
      const revisedLength = revisedTokens.length;
      const matrix = Array.from({ length: originalLength + 1 }, () =>
        Array(revisedLength + 1).fill(0)
      );

      for (let row = originalLength - 1; row >= 0; row -= 1) {
        for (let column = revisedLength - 1; column >= 0; column -= 1) {
          if (originalTokens[row] === revisedTokens[column]) {
            matrix[row][column] = matrix[row + 1][column + 1] + 1;
          } else {
            matrix[row][column] = Math.max(
              matrix[row + 1][column],
              matrix[row][column + 1]
            );
          }
        }
      }

      const segments = [];
      let row = 0;
      let column = 0;
      let currentType = null;
      let currentTokens = [];

      const pushCurrentSegment = () => {
        if (currentType && currentTokens.length) {
          segments.push({ type: currentType, tokens: currentTokens });
        }

        currentType = null;
        currentTokens = [];
      };

      const pushToken = (type, token) => {
        if (currentType !== type) {
          pushCurrentSegment();
          currentType = type;
        }

        currentTokens.push(token);
      };

      while (row < originalLength && column < revisedLength) {
        if (originalTokens[row] === revisedTokens[column]) {
          pushToken("equal", originalTokens[row]);
          row += 1;
          column += 1;
          continue;
        }

        if (matrix[row + 1][column] >= matrix[row][column + 1]) {
          pushToken("delete", originalTokens[row]);
          row += 1;
        } else {
          pushToken("insert", revisedTokens[column]);
          column += 1;
        }
      }

      while (row < originalLength) {
        pushToken("delete", originalTokens[row]);
        row += 1;
      }

      while (column < revisedLength) {
        pushToken("insert", revisedTokens[column]);
        column += 1;
      }

      pushCurrentSegment();

      return segments;
    }

    _renderRefinementDiff(diffResult) {
      if (!diffResult || diffResult.noMeaningfulChange) {
        return `
          <p class="lx-conv-refine__status lx-conv-refine__status--positive">
            Your answer is already good.
          </p>
        `;
      }

      return `
        <div class="lx-conv-refine__diff" data-refinement-state="changed">
          ${this._renderRefinementSegments(diffResult.segments || [])}
        </div>
      `;
    }

    _renderRefinementSegments(segments) {
      let html = "";
      let previousToken = null;

      segments.forEach((segment) => {
        const segmentClass =
          segment.type === "insert"
            ? "lx-conv-refine__segment lx-conv-refine__segment--insert"
            : segment.type === "delete"
            ? "lx-conv-refine__segment lx-conv-refine__segment--delete"
            : "";

        segment.tokens.forEach((token) => {
          if (this._needsRefinementSpace(previousToken, token)) {
            html += " ";
          }

          const escapedToken = this._escapeHtml(token);

          if (segment.type === "equal") {
            html += escapedToken;
          } else {
            html += `<span class="${segmentClass}">${escapedToken}</span>`;
          }

          previousToken = token;
        });
      });

      return html;
    }

    setRefinementDiffVisibility(cardId, hidden) {
      const card = this._getCardEl(cardId);
      if (!card || !card.classList.contains("lx-conv-card--sub")) {
        return;
      }

      const cardType = card.getAttribute("data-type");
      if (cardType !== "correct" && cardType !== "improve") {
        return;
      }

      card.classList.toggle("lx-conv-card--refine-diff-hidden", !!hidden);

      const toggleButton = card.querySelector(".lx-conv-btn--refine-toggle");
      if (toggleButton) {
        toggleButton.setAttribute("aria-pressed", hidden ? "true" : "false");
        toggleButton.setAttribute(
          "aria-label",
          hidden ? "Show deleted diff" : "Hide deleted diff"
        );
        toggleButton.setAttribute(
          "title",
          hidden ? "Click to show deleted diff" : "Click to hide deleted diff"
        );
        toggleButton.innerHTML = this._iconMarkup(hidden ? "eye-off" : "eye");
        this._renderLucideIcons(toggleButton);
      }
    }

    toggleRefinementDiffVisibility(cardId, buttonEl) {
      const card = this._getCardEl(cardId);
      if (!card || !card.classList.contains("lx-conv-card--sub")) {
        return;
      }

      const cardType = card.getAttribute("data-type");
      if (cardType !== "correct" && cardType !== "improve") {
        return;
      }

      const hidden = !card.classList.contains("lx-conv-card--refine-diff-hidden");
      this.setRefinementDiffVisibility(cardId, hidden);

      if (buttonEl) {
        buttonEl.setAttribute("aria-pressed", hidden ? "true" : "false");
      }
    }

    _needsRefinementSpace(previousToken, currentToken) {
      if (!previousToken) return false;

      if (this._isClosingPunctuationToken(currentToken)) return false;
      if (this._isOpeningPunctuationToken(previousToken)) return false;

      const previousIsWord = this._isWordToken(previousToken);
      const currentIsWord = this._isWordToken(currentToken);

      if (previousIsWord && currentIsWord) return true;
      if (previousIsWord && this._isOpeningPunctuationToken(currentToken)) return true;
      if (this._isClosingPunctuationToken(previousToken) && currentIsWord) return true;
      if (
        this._isClosingPunctuationToken(previousToken) &&
        this._isOpeningPunctuationToken(currentToken)
      ) {
        return true;
      }

      return false;
    }

    _isWordToken(token) {
      return /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/u.test(token);
    }

    _isOpeningPunctuationToken(token) {
      return ["(", "[", "{", "“", "‘", "«", '"'].includes(token);
    }

    _isClosingPunctuationToken(token) {
      return [")", "]", "}", "”", "’", "»", ".", ",", "!", "?", ":", ";", "…", "%"].includes(token);
    }

    async _runAnswerRefinementAction(answerId, actionConfig) {
      try {
        const existingSubCard = document.querySelector(
          `[data-parent-id="${answerId}"][data-type="${actionConfig.type}"]`
        );

        if (existingSubCard) {
          existingSubCard.classList.remove("lx-conv-card--hidden");
          this.expandCard(`a${answerId}`);
          this._disableAnswerActionButton(answerId, actionConfig.type);
          return;
        }

        const answerContext = this._getAnswerActionContext(answerId);
        if (!answerContext) {
          return;
        }

        window.lexi.utils.loadingAnimation(true, actionConfig.loadingMessage);

        const finalPrompt = await window.lexi.speak.prompts.getFinalPrompt(
          actionConfig.promptKey,
          answerContext.answerCard,
          { custom_data: answerContext.questionText }
        );

        if (!finalPrompt) {
          console.error(`Failed to generate final prompt for ${actionConfig.type}`);
          window.lexi.utils.loadingAnimation(false);
          return;
        }

        console.log(`[LEXI] ${actionConfig.type} final prompt:`, finalPrompt);

        const promptDescription = window.lexi.speak.prompts.getPromptDescription(
          actionConfig.promptKey
        );
        if (promptDescription) {
          window.lexi.utils.loadingAnimation(true, promptDescription);
        }

        const HELPER_BOT_ID = window.lexi.speak.botId.system;

        window.lexi.utils.controlChatbot(
          HELPER_BOT_ID,
          false,
          finalPrompt,
          true,
          true,
          true,
          () => {
            window.lexi.utils.loadingAnimation(false);

            const htmlReply = window.lexi.utils.getLastAIReply(HELPER_BOT_ID);
            const revisedText = this._extractPlainTextFromAIReply(htmlReply);

            if (!revisedText) {
              console.error(
                `[LEXI] Empty ${actionConfig.type} response for answer ${answerId}`
              );
              return;
            }

            this.addSubCard(actionConfig.type, answerId, {
              id: `${actionConfig.type}_${answerId}_${Date.now()}`,
              text: revisedText,
              originalText: answerContext.answerText,
            });

            this._disableAnswerActionButton(answerId, actionConfig.type);

            console.log(`[LEXI] ${actionConfig.type} added successfully`);
          }
        );
      } catch (error) {
        console.error(`[LEXI] Error in ${actionConfig.type}:`, error);
        window.lexi.utils.loadingAnimation(false);
      }
    }

    async showCorrect(answerId) {
      return this._runAnswerRefinementAction(answerId, {
        type: "correct",
        promptKey: "correctAnswer",
        loadingMessage: "Correcting your answer...",
      });
    }

    async showImprove(answerId) {
      return this._runAnswerRefinementAction(answerId, {
        type: "improve",
        promptKey: "improveAnswer",
        loadingMessage: "Improving your answer...",
      });
    }

    async showHint(questionId) {
      try {
        // Check if hint card already exists
        const existingHintCard = document.querySelector(
          `[data-parent-id="${questionId}"][data-type="hint"]`
        );

        if (existingHintCard) {
          // If it exists, just show it
          existingHintCard.classList.remove("lx-conv-card--hidden");
          this.expandCard(`q${questionId}`);
          return;
        }

        // Find the parent question card
        const questionCard = document.querySelector(
          `[data-question-id="${questionId}"][data-card-type="question"]`
        );
        if (!questionCard) {
          console.error(`Question card with ID ${questionId} not found`);
          return;
        }

        // Show loading animation
        window.lexi.utils.loadingAnimation(true, "Generating hint...");

        // Get the last 3 answers from previous questions (for context if needed)
        const previousAnswers = this._getLastThreeAnswers(questionId);

        // Get the final prompt
        const finalPrompt = await window.lexi.speak.prompts.getFinalPrompt(
          "showHint",
          questionCard,
          { custom_data: previousAnswers }
        );

        if (!finalPrompt) {
          console.error("Failed to generate final prompt for showHint");
          window.lexi.utils.loadingAnimation(false);
          return;
        }

        console.log("[LEXI] showHint final prompt:", finalPrompt);

        // Get prompt description for loading message
        const promptDescription =
          window.lexi.speak.prompts.getPromptDescription("showHint");
        if (promptDescription) {
          window.lexi.utils.loadingAnimation(true, promptDescription);
        }

        // Send to chatbot and handle response
        // Using the same helper bot ID as showSample
        const HELPER_BOT_ID = window.lexi.speak.botId.system;

        window.lexi.utils.controlChatbot(
          HELPER_BOT_ID,
          false, // Don't open chatbot UI
          finalPrompt,
          true, // Send immediately
          true, // Clear chat
          true, // Is system message
          (reply) => {
            // Hide loading animation
            window.lexi.utils.loadingAnimation(false);

            // Get HTML reply from the chatbot
            const htmlReply = window.lexi.utils.getLastAIReply(HELPER_BOT_ID);

            // Add hint sub-card with AI response (HTML)
            this.addSubCard("hint", questionId, {
              id: `hint_${questionId}_${Date.now()}`,
              html: htmlReply,
            });

            console.log("[LEXI] Hint added successfully");

            // Disable the "Show Hint" button
            const hintButton = `.lx-conv-card--question[data-question-id="${questionId}"] .lx-conv-btn--secondary[onclick^='window.lexi.speak.conversation.showHint']`;
            window.lexi.utils.disableElement(hintButton, true);
          }
        );
      } catch (error) {
        console.error("[LEXI] Error in showHint:", error);
        window.lexi.utils.loadingAnimation(false);
      }
    }

    async showSample(questionId) {
      try {
        // Check if sample card already exists
        const existingSampleCard = document.querySelector(
          `[data-parent-id="${questionId}"][data-type="sample"]`
        );

        if (existingSampleCard) {
          // If it exists, just show it
          existingSampleCard.classList.remove("lx-conv-card--hidden");
          this.expandCard(`q${questionId}`);
          return;
        }

        // Find the parent question card
        const questionCard = document.querySelector(
          `[data-question-id="${questionId}"][data-card-type="question"]`
        );
        if (!questionCard) {
          console.error(`Question card with ID ${questionId} not found`);
          return;
        }

        // Show loading animation
        window.lexi.utils.loadingAnimation(true, "Generating sample answer...");

        // Get the last 3 answers from previous questions
        const previousAnswers = this._getLastThreeAnswers(questionId);

        // Get the final prompt with element context and custom data
        const finalPrompt = await window.lexi.speak.prompts.getFinalPrompt(
          "showSample",
          questionCard,
          { custom_data: previousAnswers }
        );

        if (!finalPrompt) {
          console.error("Failed to generate final prompt for showSample");
          window.lexi.utils.loadingAnimation(false);
          return;
        }

        console.log("[LEXI] showSample final prompt:", finalPrompt);

        // Get prompt description for loading message
        const promptDescription =
          window.lexi.speak.prompts.getPromptDescription("showSample");
        if (promptDescription) {
          window.lexi.utils.loadingAnimation(true, promptDescription);
        }

        // Send to chatbot and handle response
        // Use a specific botId filter to prevent callbacks from other bots
        const SAMPLE_BOT_ID = window.lexi.speak.botId.system;

        window.lexi.utils.controlChatbot(
          SAMPLE_BOT_ID, // Use specific chatbot for samples
          false, // Don't open chatbot UI
          finalPrompt,
          true, // Send immediately
          true, // Clear chat
          true, // Is system message
          (reply) => {
            // Hide loading animation
            window.lexi.utils.loadingAnimation(false);

            // Get HTML reply from the chatbot
            const htmlReply = window.lexi.utils.getLastAIReply(SAMPLE_BOT_ID);

            // Add sample sub-card with AI response (HTML)
            this.addSubCard("sample", questionId, {
              id: `sample_${questionId}_${Date.now()}`,
              html: htmlReply,
            });

            console.log("[LEXI] Sample answer added successfully");

            // Disable the "Show Sample" button
            const sampleButton = `.lx-conv-card--question[data-question-id="${questionId}"] .lx-conv-btn--secondary[onclick^='window.lexi.speak.conversation.showSample']`;
            window.lexi.utils.disableElement(sampleButton, true);
          }
        );
      } catch (error) {
        console.error("[LEXI] Error in showSample:", error);
        window.lexi.utils.loadingAnimation(false);
      }
    }

    async showAnalysis(answerId) {
      try {
        // Check if analysis card already exists
        const existingAnalysisCard = document.querySelector(
          `[data-parent-id="${answerId}"][data-type="analysis"]`
        );

        if (existingAnalysisCard) {
          // If it exists, just show it
          existingAnalysisCard.classList.remove("lx-conv-card--hidden");
          this.expandCard(`a${answerId}`);
          return;
        }

        // Find the answer card
        const answerCard = document.querySelector(
          `[data-answer-id="${answerId}"][data-card-type="answer"]`
        );
        if (!answerCard) {
          console.error(`Answer card with ID ${answerId} not found`);
          return;
        }

        // Get the question ID from the answer card
        const questionId = answerCard.getAttribute("data-question-id");
        if (!questionId) {
          console.error(`No question ID found for answer ${answerId}`);
          return;
        }

        // Find the related question card
        const questionCard = document.querySelector(
          `[data-question-id="${questionId}"][data-card-type="question"]`
        );
        if (!questionCard) {
          console.error(`Question card with ID ${questionId} not found`);
          return;
        }

        // Extract the question text
        const questionText = questionCard
          .querySelector(".lx-conv-card__txt")
          ?.textContent.trim();
        if (!questionText) {
          console.error(`No question text found for question ${questionId}`);
          return;
        }

        // Show loading animation
        window.lexi.utils.loadingAnimation(true, "Analyzing your answer...");

        // Get the final prompt with answer card context and question as custom_data
        const finalPrompt = await window.lexi.speak.prompts.getFinalPrompt(
          "analyzeAnwser",
          answerCard,
          { custom_data: questionText }
        );

        if (!finalPrompt) {
          console.error("Failed to generate final prompt for showAnalysis");
          window.lexi.utils.loadingAnimation(false);
          return;
        }

        console.log("[LEXI] showAnalysis final prompt:", finalPrompt);

        // Get prompt description for loading message
        const promptDescription =
          window.lexi.speak.prompts.getPromptDescription("analyzeAnwser");
        if (promptDescription) {
          window.lexi.utils.loadingAnimation(true, promptDescription);
        }

        // Send to chatbot and handle response
        const ANALYSIS_BOT_ID = window.lexi.speak.botId.system;

        window.lexi.utils.controlChatbot(
          ANALYSIS_BOT_ID,
          false, // Don't open chatbot UI
          finalPrompt,
          true, // Send immediately
          true, // Clear chat
          true, // Is system message
          (reply) => {
            // Hide loading animation
            window.lexi.utils.loadingAnimation(false);

            // Get HTML reply from the chatbot
            const htmlReply = window.lexi.utils.getLastAIReply(ANALYSIS_BOT_ID);

            // Add analysis sub-card with AI response (HTML)
            this.addSubCard("analysis", answerId, {
              id: `analysis_${answerId}_${Date.now()}`,
              feedback: htmlReply,
              scores: {}, // Empty scores for now, can be parsed from AI response if needed
              suggestions: [], // Empty suggestions for now
            });

            console.log("[LEXI] Analysis added successfully");

            // Style any score badges in the analysis text
            window.lexi.utils.styleScoreBadges(
              `.lx-conv-card--analysis[data-parent-id="${answerId}"] .lx-conv-sub__txt em`
            );

            // Disable the "Analyze" button
            this._disableAnswerActionButton(answerId, "analysis");
          }
        );
      } catch (error) {
        console.error("[LEXI] Error in showAnalysis:", error);
        window.lexi.utils.loadingAnimation(false);
      }
    }

    clearConversation() {
      if (!this.timeline) return;

      // Preserve any existing .lx-conv-empty elements inside the timeline.
      // Move them out, clear the timeline, then re-append so they are not removed.
      const empties = Array.from(
        this.timeline.querySelectorAll(".lx-conv-empty")
      );
      const preserved = [];
      empties.forEach((el) => {
        // Only preserve elements that are still in the timeline
        if (this.timeline.contains(el)) {
          preserved.push(el);
          el.remove();
        }
      });

      // Clear remaining content
      this.timeline.innerHTML = "";

      // Re-append preserved empty elements (in original order)
      preserved.forEach((el) => this.timeline.appendChild(el));

      // Update download button state
      this._updateDownloadButtonState();
      this._updateCheckScoreButtonState();

      this._trigger("conversation:cleared");
    }

    getCardState(cardId) {
      const el = this._getCardEl(cardId);
      if (!el) return null;
      return {
        collapsed: el.classList.contains("lx-conv-card--collapsed"),
        hidden: el.classList.contains("lx-conv-card--hidden"),
      };
    }

    _getCardEl(id) {
      // Try by ID first (if passed as ID)
      let el = document.getElementById(id);
      if (el) return el;

      // Try by data attributes
      el = document.getElementById(`card-${id}`);
      if (el) return el;

      // Try query selector for data-*-id
      el =
        document.querySelector(`[data-question-id="${id}"]`) ||
        document.querySelector(`[data-answer-id="${id}"]`) ||
        document.querySelector(`[data-sub-id="${id}"]`);

      return el;
    }

    _collapseAll() {
      // Collapse all question and answer cards
      const cards = document.querySelectorAll(
        ".lx-conv-card--question, .lx-conv-card--answer"
      );
      cards.forEach((card) => {
        if (card.id) {
          this.collapseCard(card.id);
        }
      });
    }

    /**
     * Export all conversation cards to a single HTML document
     * @returns {string} - HTML string containing all conversation content
     */
    exportToHTML() {
      if (!this.timeline) return "";

      const cards = this.timeline.querySelectorAll(".lx-conv-card");
      if (cards.length === 0) {
        return "<p>No conversation content available.</p>";
      }

      // Get configuration info
      const configData = window.lexi?.speak?.config?.getAllFields() || {};
      const practiceMode = configData.practice_mode || "N/A";
      const topic = configData.topic || "N/A";
      const scenario = configData.scenario || "N/A";

      // Get current date and time in ISO 8601 format (UTC)
      const now = new Date();
      const dateTime = now.toLocaleString(); // Format: 2025-12-15T10:30:45.123Z

      // Build header with metadata
      let html = "<div>";
      html += `<p><strong>Date & Time:</strong> ${dateTime}</p>`;
      html += `<p><strong>Practice Mode:</strong> ${practiceMode}</p>`;
      html += `<p><strong>Topic:</strong> ${topic}</p>`;
      html += `<p><strong>Scenario:</strong> ${scenario}</p>`;
      html += "<h2>Questions & Answers</h2>";

      let currentQuestionNumber = null;

      cards.forEach((card) => {
        const cardType = card.getAttribute("data-card-type");

        if (cardType === "question") {
          const questionId = card.getAttribute("data-question-id");
          const questionNumberEl = card.querySelector(".lx-conv-card__num");
          const questionNumber = questionNumberEl
            ? questionNumberEl.textContent.trim()
            : "";
          const questionTextEl = card.querySelector(".lx-conv-card__txt");
          const questionText = questionTextEl
            ? questionTextEl.innerHTML.trim()
            : "";

          currentQuestionNumber = questionNumber;

          html += `<h3>${questionNumber}: ${questionText}</h3>`;
        } else if (cardType === "answer") {
          const answerId = card.getAttribute("data-answer-id");
          const questionId = card.getAttribute("data-question-id");
          const metaEl = card.querySelector(".lx-conv-card__meta");
          const answerTextEl = card.querySelector(".lx-conv-card__txt");
          const answerText = answerTextEl
            ? answerTextEl.textContent.trim()
            : "";

          // Extract attempt number from meta
          let attemptNumber = "";
          if (metaEl) {
            const attemptText = metaEl.textContent.match(/Attempt\s+(\d+)/i);
            if (attemptText) {
              attemptNumber = ` (Attempt ${attemptText[1]})`;
            }
          }

          html += `<h4>Answer${attemptNumber}</h4>`;
          html += `<p>${answerText}</p>`;
        } else if (cardType === "sub") {
          const subType = card.getAttribute("data-type");
          const parentId = card.getAttribute("data-parent-id");

          if (subType === "hint") {
            const hintTextEl = card.querySelector(".lx-conv-sub__txt");
            const hintText = hintTextEl ? hintTextEl.innerHTML.trim() : "";

            html += `<h4>Hint</h4>`;
            html += `<p>${hintText}</p>`;
          } else if (subType === "sample") {
            const sampleTextEl = card.querySelector(".lx-conv-sub__txt");
            const sampleText = sampleTextEl
              ? sampleTextEl.innerHTML.trim()
              : "";

            html += `<h4>Sample Answer</h4>`;
            html += `<p>${sampleText}</p>`;
          } else if (subType === "analysis") {
            html += `<h4>Analysis</h4>`;

            // Check for scores
            const scoreElements = card.querySelectorAll(".lx-conv-score");
            if (scoreElements.length > 0) {
              html += `<p><strong>Scores:</strong></p>`;
              html += `<ul>`;
              scoreElements.forEach((scoreEl) => {
                const labelEl = scoreEl.querySelector(".lx-conv-score__label");
                const valEl = scoreEl.querySelector(".lx-conv-score__val");
                const label = labelEl ? labelEl.textContent.trim() : "";
                const value = valEl ? valEl.textContent.trim() : "";
                html += `<li>${label}: ${value}</li>`;
              });
              html += `</ul>`;
            }

            // Check for feedback
            const feedbackEl = card.querySelector(
              ".lx-conv-analysis__feedback .lx-conv-sub__txt"
            );
            if (feedbackEl) {
              const feedbackText = feedbackEl.textContent.trim();
              html += `<p><strong>Feedback:</strong></p>`;
              html += `<p>${feedbackText}</p>`;
            }

            // Check for suggestions
            const suggestionsEl = card.querySelector(
              ".lx-conv-analysis__suggestions"
            );
            if (suggestionsEl) {
              html += `<p><strong>Suggestions:</strong></p>`;
              html += `<ul>`;
              const suggestions = suggestionsEl.querySelectorAll("li");
              suggestions.forEach((suggestionEl) => {
                html += `<li>${suggestionEl.textContent.trim()}</li>`;
              });
              html += `</ul>`;
            }

            // If no structured content, check for direct text content
            if (scoreElements.length === 0 && !feedbackEl && !suggestionsEl) {
              const analysisTextEl = card.querySelector(".lx-conv-sub__txt");
              if (analysisTextEl) {
                html += `<p>${analysisTextEl.innerHTML.trim()}</p>`;
              }
            }
          }
        }
      });

      html += "</div>";
      return html;
    }
  }

  // Initialize
  window.lexi.speak.conversation = new ConversationManager();
  window.lexi.speak.conversation.init();

  // ---------------------------------------------------------------------------
  // Demo helper — testing only
  // Usage: window.lexi.speak.conversation.loadDemo()
  //        window.lexi.speak.conversation.loadDemo(8) // 8 Q&A pairs
  // ---------------------------------------------------------------------------
  window.lexi.speak.conversation.loadDemo = function (count = 6) {
    const QUESTIONS = [
      "Can you describe your hometown and what you like most about it?",
      "How do you usually spend your free time? Do you have any hobbies?",
      "What are the advantages and disadvantages of living in a big city?",
      "Do you think technology has made people's lives better or worse? Why?",
      "Describe a memorable journey or trip you have taken. What made it special?",
      "How important is it for young people to learn a foreign language today?",
      "What changes would you like to see in your local community in the future?",
      "Do you prefer working alone or as part of a team? Explain your preference.",
      "How has the internet changed the way people communicate with each other?",
      "What role does music play in your daily life?",
    ];

    const ANSWERS = [
      "I grew up in a mid-sized coastal city.",
      "In my spare time I enjoy reading, mostly non-fiction books on history and science. I also go for long walks in the park near my apartment, which helps me clear my head after a busy day at work.",
      "Living in a big city offers many opportunities in terms of employment, education, and entertainment. However, it can also be quite stressful due to traffic congestion, higher costs of living, and a general lack of quiet green spaces.",
      "I think technology has largely improved our lives by making information more accessible and communication faster. That said, issues like social media addiction and reduced face-to-face interaction are real drawbacks worth considering.",
      "A few years ago I travelled to Japan.",
      "Learning a foreign language is extremely valuable today because it opens up career opportunities, allows you to connect with more people, and broadens your cultural perspective significantly.",
    ];

    const n = Math.min(count, QUESTIONS.length, ANSWERS.length);
    const conv = window.lexi.speak.conversation;

    for (let i = 0; i < n; i++) {
      const num = i + 1;
      conv.addQuestion({
        id: String(num),
        number: num,
        examinerName: "Examiner",
        text: QUESTIONS[i],
      });
      conv.addAnswer({
        id: String(num),
        questionId: String(num),
        questionNumber: num,
        candidateName: "You",
        text: ANSWERS[i],
        attempt: 1,
      });
    }

    console.log(`[LexiSpeak Demo] Added ${n} Q&A pairs.`);
  };
})();

/**
 * Process AI reply and add question card to conversation
 * @param {string} aiReply - HTML string containing AI question
 */
function addQuestionFromAI(botId) {
  const aiReply = window.lexi.utils.getLastAIReply(botId);
  if (!aiReply) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(aiReply, "text/html");
  const questionEl = doc.querySelector(".lx-ai-question");

  if (questionEl) {
    const questionId =
      questionEl.getAttribute("data-id") || Date.now().toString();
    const questionText = questionEl.innerHTML || "No question text provided.";

    window.lexi.speak.conversation.addQuestion({
      id: questionId,
      number: questionId,
      examinerName: "Examiner",
      text: questionText,
    });
  }
}

/* // Add an answer card
 * window.lexi.speak.conversation.addAnswer({
 *   id: '1',
 *   questionId: '1',
 *   questionNumber: 1,
 *   candidateName: 'John Doe',
 *   text: 'My name is John Doe.',
 *   attempt: 1
 * }); */

// Conversation container id="mwai-chatbot-{botId}
// Conversation container contains the below structure
/* conversaion structure:
.mwai-reply.mwai-user .mwai-text
.mwai-reply.mwai-ai .mwai-text
.mwai-reply.mwai-user .mwai-text
... */
/**
 * Add user's answer to the conversation timeline.
 *
 * Steps:
 * 1. Get the latest AI reply HTML using getLastAIReply(botId).
 * 2. Parse the HTML of this reply and look for <p data-answered="true"> elements.
 * 3. If found:
 *    - From the latest (the bottom) .mwai-reply.mwai-ai of id="mwai-chatbot-{botId}"
 *    - Find the closest .mwai-reply.mwai-user .mwai-text element, add the "lx-user-answer" class to it.
 * 4. Then parse through all the .lx-user-answer elements in id="mwai-chatbot-{botId} to add some attributes:
 *  - data-question-id: find the nearest (to the top) .lx-ai-question's data-id from each .lx-user-answer.
 *    - Set data-attempt based on the number of previous answers for that question.
 *    - Assign a unique data-answer-id (incremental).
 * 5. Run addAnswer() to add the latest answer card.
 */
function addAnswerFromUser(botId) {
  // Step 1: Get the latest AI reply
  const aiReply = window.lexi.utils.getLastAIReply(botId);
  if (!aiReply) return;

  // Step 2: Parse the HTML and look for data-answered="true"
  const parser = new DOMParser();
  const doc = parser.parseFromString(aiReply, "text/html");
  const answeredElement = doc.querySelector('[data-answered="true"]');

  if (!answeredElement) return;

  // Step 3: Find and mark the user answer element
  const chatContainer = document.getElementById(`mwai-chatbot-${botId}`);
  if (!chatContainer) return;

  // Get all AI replies and find the latest one
  const aiReplies = chatContainer.querySelectorAll(".mwai-reply.mwai-ai");
  const latestAIReply = aiReplies[aiReplies.length - 1];

  if (!latestAIReply) return;

  // Find the closest preceding user reply
  let userReply = latestAIReply.previousElementSibling;
  while (userReply && !userReply.classList.contains("mwai-user")) {
    userReply = userReply.previousElementSibling;
  }

  if (!userReply) return;

  const userTextElement = userReply.querySelector(".mwai-text");
  if (
    userTextElement &&
    !userTextElement.classList.contains("lx-user-answer")
  ) {
    userTextElement.classList.add("lx-user-answer");
  }

  // Step 4: Process all user answers and add attributes
  const allUserAnswers = chatContainer.querySelectorAll(".lx-user-answer");
  let answerIdCounter = 1;

  allUserAnswers.forEach((answerEl) => {
    // Skip if already processed
    if (answerEl.hasAttribute("data-answer-id")) {
      answerIdCounter++;
      return;
    }

    // Find the nearest AI question (searching backwards)
    let questionId = null;
    let currentElement = answerEl.closest(".mwai-reply");

    while (currentElement) {
      currentElement = currentElement.previousElementSibling;
      if (currentElement && currentElement.classList.contains("mwai-ai")) {
        const aiText = currentElement.querySelector(".mwai-text");
        if (aiText) {
          const questionEl = aiText.querySelector(".lx-ai-question");
          if (questionEl) {
            questionId = questionEl.getAttribute("data-id");
            break;
          }
        }
      }
    }

    if (!questionId) return;

    // Count previous answers for this question to determine attempt number
    let attempt = 1;
    const previousAnswers = Array.from(allUserAnswers).slice(
      0,
      Array.from(allUserAnswers).indexOf(answerEl)
    );
    previousAnswers.forEach((prevAnswer) => {
      if (prevAnswer.getAttribute("data-question-id") === questionId) {
        attempt++;
      }
    });

    // Set attributes
    answerEl.setAttribute("data-question-id", questionId);
    answerEl.setAttribute("data-attempt", attempt);
    answerEl.setAttribute("data-answer-id", answerIdCounter);

    answerIdCounter++;
  });

  // Step 5: Add the latest answer card
  const latestAnswer = allUserAnswers[allUserAnswers.length - 1];
  if (latestAnswer && latestAnswer.hasAttribute("data-answer-id")) {
    const answerId = latestAnswer.getAttribute("data-answer-id");
    const questionId = latestAnswer.getAttribute("data-question-id");
    const attempt = latestAnswer.getAttribute("data-attempt");
    const answerText = latestAnswer.textContent.trim();

    window.lexi.speak.conversation.addAnswer({
      id: answerId,
      questionId: questionId,
      questionNumber: questionId,
      candidateName: "You",
      text: answerText,
      attempt: parseInt(attempt),
    });
  }
}

// Expose function on the conversation manager instance
if (window.lexi && window.lexi.speak && window.lexi.speak.conversation) {
  window.lexi.speak.conversation.addQuestionFromAI = addQuestionFromAI;
  window.lexi.speak.conversation.addAnswerFromUser = addAnswerFromUser;
}
