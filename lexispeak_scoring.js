/**
 * LexiSpeak Scoring Orchestrator
 *
 * Replaces check-score.js, grammar-score.js, and lexical-score.js with a
 * single thin orchestrator that drives all three phases through the generic
 * scoring AJAX endpoints (scoring_prep, scoring_process_ai, scoring_backend).
 *
 * All diff, parsing, and metric computation now happen server-side.
 * This file only:
 *   1. Collects answers from the DOM.
 *   2. Posts to the three AJAX endpoints.
 *   3. Calls the system chatbot to get AI replies for subcriteria that need one.
 *   4. Dispatches final results to the event bus / console.
 *
 * Public API: window.lexi.speak.scoring = { run, collectAnswers }
 */
(function () {
  "use strict";

  window.lexi = window.lexi || {};
  window.lexi.speak = window.lexi.speak || {};

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function getSettings() {
    const cfg = window.lexi?.speak?.config?.getAllFields?.() || {};
    return {
      targetLanguage:   cfg.target_language   || "english",
      feedbackLanguage: cfg.feedback_language || "english",
      scenario:         cfg.scenario          || "",
      focusArea:        cfg.focus_area        || "",
    };
  }

  function getNonce() {
    return (window.lexiSettings || {}).scoringNonce || "";
  }

  function getAjaxUrl() {
    return (window.lexiSettings || {}).ajaxUrl || "/wp-admin/admin-ajax.php";
  }

  function makeFormData(action, fields) {
    const fd = new FormData();
    fd.append("action", action);
    fd.append("nonce",  getNonce());
    for (const [k, v] of Object.entries(fields)) {
      fd.append(k, typeof v === "object" ? JSON.stringify(v) : v);
    }
    return fd;
  }

  async function ajaxPost(action, fields) {
    const response = await fetch(getAjaxUrl(), {
      method: "POST",
      body:   makeFormData(action, fields),
    });
    if (!response.ok) {
      throw new Error("[LexiSpeak Scoring] HTTP error " + response.status);
    }
    const json = await response.json();
    if (!json.success) {
      throw new Error("[LexiSpeak Scoring] Server error: " + JSON.stringify(json.data));
    }
    return json.data;
  }

  function dispatchScoringEvent(name, detail) {
    if (typeof document === "undefined" || typeof document.dispatchEvent !== "function") {
      return;
    }

    if (typeof CustomEvent === "function") {
      document.dispatchEvent(new CustomEvent(name, { detail }));
      return;
    }

    const event = document.createEvent("CustomEvent");
    event.initCustomEvent(name, false, false, detail);
    document.dispatchEvent(event);
  }

  // ---------------------------------------------------------------------------
  // Run ID and Phase Helpers
  // ---------------------------------------------------------------------------

  function createRunId() {
    return `score-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const PHASE_MAP = {
    c01: { phaseKey: "readiness", label: "AI Quick Check" },
    c02: { phaseKey: "grammar", label: "Grammatical Range and Accuracy" },
    c03: { phaseKey: "lexical", label: "Lexical Resource" },
    c04: { phaseKey: "coherence", label: "Fluency and Coherence" },
  };

  function dispatchPhaseStart(runId, criterionId) {
    const phase = PHASE_MAP[criterionId];
    if (!phase) return;
    dispatchScoringEvent("lexispeak:scoring-phase-start", {
      runId,
      criterionId,
      phaseKey: phase.phaseKey,
      label: phase.label,
    });
  }

  function dispatchPhaseComplete(runId, criterionId, result, partialResult) {
    const phase = PHASE_MAP[criterionId];
    if (!phase) return;
    dispatchScoringEvent("lexispeak:scoring-phase-complete", {
      runId,
      criterionId,
      phaseKey: phase.phaseKey,
      label: phase.label,
      result,
      partialResult,
    });
  }

  /**
   * Query the hidden system chatbot with isSystem=false (scoring queries).
   * Returns a Promise that resolves to the AI reply string.
   */
  function querySystemBot(promptText) {
    return new Promise((resolve, reject) => {
      const botId = window.lexi?.speak?.botId?.system || "lexispeak-system";
      const ok = window.lexi?.utils?.controlChatbot?.(
        botId,
        false,       // shouldOpen
        promptText,
        true,        // sendImmediately
        true,        // shouldClear
        false,       // isSystem — scoring queries use isSystem=false
        (reply) => resolve(reply)
      );
      if (ok === false) {
        reject(new Error("[LexiSpeak Scoring] System chatbot unavailable."));
      }
    });
  }

  /**
   * Get the final prompt text for a promptKey with custom variable overrides.
   */
  async function getPrompt(promptKey, variables) {
    const prompts = window.lexi?.speak?.prompts;
    if (!prompts?.getFinalPrompt) {
      throw new Error("[LexiSpeak Scoring] prompts module not loaded.");
    }
    return prompts.getFinalPrompt(promptKey, null, variables);
  }

  // ---------------------------------------------------------------------------
  // collectAnswers — reads answer cards from the DOM
  // ---------------------------------------------------------------------------

  /**
   * @returns {Array<{questionId: string, answerId: string, questionText: string, text: string}>}
   */
  function collectAnswers() {
    const timeline = document.getElementById("lx-conversation-timeline");
    if (!timeline) return [];

    const answers = [];
    timeline.querySelectorAll(".lx-conv-card--answer").forEach((card) => {
      const questionId = card.getAttribute("data-question-id") || "";
      const answerId = card.getAttribute("data-answer-id") || "";
      const text = (card.querySelector(".lx-conv-card__txt")?.textContent || "").trim();
      if (!questionId) return;

      // Collect the matching question text so coherence scoring can evaluate relevance.
      const escapedId = CSS.escape ? CSS.escape(questionId) : questionId.replace(/[\\!"#$%&'()*+,./:;<=>?@[\]^`{|}~]/g, "\\$&");
      const questionCard = timeline.querySelector(
        `.lx-conv-card--question[data-question-id="${escapedId}"]`
      );
      const questionText = (questionCard?.querySelector(".lx-conv-card__txt")?.textContent || "").trim();

      answers.push({ questionId, answerId, questionText, text });
    });
    return answers;
  }

  // ---------------------------------------------------------------------------
  // Generic AJAX wrappers
  // ---------------------------------------------------------------------------

  async function doPrep(criterionId, answers, settings) {
    return ajaxPost("lexi_lexispeak_scoring_prep", {
      criterion_id:      criterionId,
      answers:           answers,
      target_language:   settings.targetLanguage,
      feedback_language: settings.feedbackLanguage,
      scenario:          settings.scenario,
      focus_area:        settings.focusArea || "",
    });
  }

  async function doProcessAi(criterionId, subcriterionId, aiOutput, prep, settings) {
    return ajaxPost("lexi_lexispeak_scoring_process_ai", {
      criterion_id:      criterionId,
      subcriterion_id:   subcriterionId,
      ai_output:         aiOutput,
      prep:              prep,
      feedback_language: settings.feedbackLanguage,
      scenario:          settings.scenario,
    });
  }

  async function doCriterionSummary(criterionId, subcriteria, settings) {
    return ajaxPost("lexi_lexispeak_scoring_backend", {
      criterion_id:      criterionId,
      subcriterion_id:   "__criterion_summary",
      prep:              {},
      ai_results:        subcriteria,
      feedback_language: settings.feedbackLanguage,
      scenario:          settings.scenario,
    });
  }

  // ---------------------------------------------------------------------------
  // Phase 1 — C01: AI Overview (fully backend)
  // ---------------------------------------------------------------------------

  async function runC01(answers, settings) {
    console.log("[LexiSpeak Scoring] C01: starting prep...");
    const prep = await doPrep("c01", answers, settings);
    const result = prep.backendResults?.s01;
    console.log("[LexiSpeak Scoring] C01/s01 result:", result);

    if (!result?.passed) {
      console.warn("[LexiSpeak Scoring] C01 gate failed — scoring stops.");
      return { passed: false, results: { c01: { s01: result } } };
    }

    return { passed: true, prep, results: { c01: { s01: result } } };
  }

  // ---------------------------------------------------------------------------
  // Phase 2 — C02: Grammar (Range + Accuracy)
  // ---------------------------------------------------------------------------

  async function runC02(answers, settings) {
    console.log("[LexiSpeak Scoring] C02: starting prep...");
    const prep = await doPrep("c02", answers, settings);

    // s01: Grammar Range — AI classifies sentence types/structures.
    const rangePrompt = await getPrompt("grammarRange", {
      sentences_block:   prep.sentencesBlock,
      language:          settings.targetLanguage,
      target_language:   settings.targetLanguage,
      feedback_language: settings.feedbackLanguage,
    });
    if (!rangePrompt) throw new Error("[LexiSpeak Scoring] grammarRange prompt unavailable.");

    console.log("[LexiSpeak Scoring] C02/s01: querying AI for grammar range...");
    const rangeReply = await querySystemBot(rangePrompt);
    const rangeResult = await doProcessAi("c02", "s01", rangeReply, prep, settings);
    console.log("[LexiSpeak Scoring] C02/s01 result:", rangeResult.result);

    // s02: Grammar Accuracy — AI rewrites corrected paragraph.
    const accuracyPrompt = await getPrompt("grammarAccuracy", {
      paragraph:          prep.combinedParagraph,
      target_language:    settings.targetLanguage,
      feedback_language:  settings.feedbackLanguage,
    });
    if (!accuracyPrompt) throw new Error("[LexiSpeak Scoring] grammarAccuracy prompt unavailable.");

    console.log("[LexiSpeak Scoring] C02/s02: querying AI for grammar accuracy...");
    const accuracyReply = await querySystemBot(accuracyPrompt);
    const accuracyResult = await doProcessAi("c02", "s02", accuracyReply, prep, settings);
    console.log("[LexiSpeak Scoring] C02/s02 result:", accuracyResult.result);

    const subcriteria = {
      s01: rangeResult.result,
      s02: accuracyResult.result,
    };
    const summary = await doCriterionSummary("c02", subcriteria, settings);
    return { ...summary, ...subcriteria };
  }

  // ---------------------------------------------------------------------------
  // Phase 3 — C03: Lexical Resource
  // ---------------------------------------------------------------------------

  async function runC03(answers, settings) {
    console.log("[LexiSpeak Scoring] C03: starting prep...");
    const prep = await doPrep("c03", answers, settings);

    // s01: Diversity — fully backend, already in prep.backendResults.
    const diversityResult = prep.backendResults?.s01;
    console.log("[LexiSpeak Scoring] C03/s01 (diversity) result:", diversityResult);

    // s02: Single-word Level — AI returns comma-separated advanced words.
    const singleWordPrompt = await getPrompt("lexicalAdvancedWords", {
      paragraph:         prep.paragraph,
      language:          settings.targetLanguage,
      target_language:   settings.targetLanguage,
      feedback_language: settings.feedbackLanguage,
    });
    if (!singleWordPrompt) throw new Error("[LexiSpeak Scoring] lexicalAdvancedWords prompt unavailable.");

    console.log("[LexiSpeak Scoring] C03/s02: querying AI for single-word level...");
    const singleWordReply = await querySystemBot(singleWordPrompt);
    const singleWordResult = await doProcessAi("c03", "s02", singleWordReply, prep, settings);
    console.log("[LexiSpeak Scoring] C03/s02 result:", singleWordResult.result);

    // s03+s04: Multi-word Usage + Level — one AI call, two results.
    const multiWordPrompt = await getPrompt("lexicalMultiWordExpressions", {
      paragraph:         prep.paragraph,
      language:          settings.targetLanguage,
      target_language:   settings.targetLanguage,
      feedback_language: settings.feedbackLanguage,
    });
    if (!multiWordPrompt) throw new Error("[LexiSpeak Scoring] lexicalMultiWordExpressions prompt unavailable.");

    console.log("[LexiSpeak Scoring] C03/s03+s04: querying AI for multi-word expressions...");
    const multiWordReply = await querySystemBot(multiWordPrompt);
    const multiWordResults = await doProcessAi("c03", "s03", multiWordReply, prep, settings);
    console.log("[LexiSpeak Scoring] C03/s03 result:", multiWordResults.s03);
    console.log("[LexiSpeak Scoring] C03/s04 result:", multiWordResults.s04);

    // s05: Lexical Accuracy — AI rewrites corrected paragraph (word-level diff in PHP).
    const accuracyPrompt = await getPrompt("lexicalAccuracy", {
      paragraph:         prep.paragraph,
      target_language:   settings.targetLanguage,
      feedback_language: settings.feedbackLanguage,
    });
    if (!accuracyPrompt) throw new Error("[LexiSpeak Scoring] lexicalAccuracy prompt unavailable.");

    console.log("[LexiSpeak Scoring] C03/s05: querying AI for lexical accuracy...");
    const accuracyReply = await querySystemBot(accuracyPrompt);
    const accuracyResult = await doProcessAi("c03", "s05", accuracyReply, prep, settings);
    console.log("[LexiSpeak Scoring] C03/s05 result:", accuracyResult.result);

    const subcriteria = {
      s01: diversityResult,
      s02: singleWordResult.result,
      s03: multiWordResults.s03,
      s04: multiWordResults.s04,
      s05: accuracyResult.result,
    };
    const summary = await doCriterionSummary("c03", subcriteria, settings);
    return { ...summary, ...subcriteria };
  }

  // ---------------------------------------------------------------------------
  // Phase 4 — C04: Fluency and Coherence / Coherence only
  // ---------------------------------------------------------------------------

  async function runC04(answers, settings) {
    console.log("[LexiSpeak Scoring] C04: starting prep...");
    const prep = await doPrep("c04", answers, settings);

    // AI Call 1: coherenceAssessment → s01 (Relevance) + s02 (Sequencing) + s03 (Development)
    const coherencePrompt = await getPrompt("coherenceAssessment", {
      qa_block:          prep.qaBlock,
      language:          settings.targetLanguage,
      target_language:   settings.targetLanguage,
      feedback_language: settings.feedbackLanguage,
      scenario:          settings.scenario,
      focus_area:        settings.focusArea || "",
    });
    if (!coherencePrompt) throw new Error("[LexiSpeak Scoring] coherenceAssessment prompt unavailable.");

    console.log("[LexiSpeak Scoring] C04: querying AI for relevance/sequencing/development...");
    const coherenceReply   = await querySystemBot(coherencePrompt);
    const coherenceResults = await doProcessAi("c04", "s01", coherenceReply, prep, settings);
    // coherenceResults = { s01: {...}, s02: {...}, s03: {...} }
    const { s01, s02, s03 } = coherenceResults;
    console.log("[LexiSpeak Scoring] C04/s01 result:", s01);
    console.log("[LexiSpeak Scoring] C04/s02 result:", s02);
    console.log("[LexiSpeak Scoring] C04/s03 result:", s03);

    // AI Call 2: cohesiveDevices → s04 (session-level)
    const devicesPrompt = await getPrompt("cohesiveDevices", {
      qa_block:          prep.qaBlock,
      language:          settings.targetLanguage,
      feedback_language: settings.feedbackLanguage,
    });
    if (!devicesPrompt) throw new Error("[LexiSpeak Scoring] cohesiveDevices prompt unavailable.");

    console.log("[LexiSpeak Scoring] C04/s04: querying AI for cohesive devices...");
    const devicesReply = await querySystemBot(devicesPrompt);
    const s04          = await doProcessAi("c04", "s04", devicesReply, prep, settings);
    console.log("[LexiSpeak Scoring] C04/s04 result:", s04);

    // Criterion-level aggregation: weighted average of all 4 subcriterion weightedScores.
    const subcriteria        = [s01, s02, s03, s04];
    const totalWeightedScore = subcriteria.reduce((sum, r) => sum + (r?.weightedScore ?? 0), 0);
    const totalWeight        = subcriteria.reduce((sum, r) => sum + (r?.weight ?? 0), 0);
    const criterionScore     = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    console.log("[LexiSpeak Scoring] C04 criterion score:", criterionScore);

    const summary = await doCriterionSummary("c04", { s01, s02, s03, s04 }, settings);
    return { ...summary, s01, s02, s03, s04, criterionScore: summary.criterionScore ?? criterionScore };
  }

  // ---------------------------------------------------------------------------
  // Main entry-point
  // ---------------------------------------------------------------------------

  /**
   * Run all enabled scoring criteria in order.
   * Stops if the Phase 1 gate fails.
   *
   * @returns {Promise<Object>} Aggregated scoring results.
   */
  async function run() {
    const answers = collectAnswers();
    const runId = createRunId();

    if (answers.length === 0) {
      console.warn("[LexiSpeak Scoring] No answers found in DOM.");
      dispatchScoringEvent("lexispeak:scoring-empty", { runId, reason: "no_answers" });
      return null;
    }

    // Log question+answer pairs (raw text, grouped by questionId).
    (function logAnswerPairs() {
      const byQ = {};
      answers.forEach((a) => {
        if (!byQ[a.questionId]) byQ[a.questionId] = [];
        byQ[a.questionId].push(a.text);
      });
      const lines = ["[LexiSpeak Scoring] Question + Answer pairs:"];
      Object.entries(byQ).forEach(([qid, texts]) => {
        const qCard = document.querySelector(
          `.lx-conv-card--question[data-question-id="${qid}"]`
        );
        const qText =
          qCard?.querySelector(".lx-conv-card__txt")?.textContent?.trim() ||
          `Question ${qid}`;
        lines.push(`  === Q${qid}: ${qText} ===`);
        texts.forEach((t, i) => lines.push(`  [Attempt ${i + 1}] ${t}`));
      });
      console.log(lines.join("\n"));
    })();

    const settings = getSettings();
    console.log("[LexiSpeak Scoring] Starting run with settings:", settings);

    const finalResult = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      settings,
      answerSummary: {
        answerCount: answers.length,
        questionCount: new Set(answers.map((answer) => answer.questionId)).size,
      },
      criteria: {},
    };

    // Dispatch scoring start event
    dispatchScoringEvent("lexispeak:scoring-start", {
      runId,
      answerSummary: finalResult.answerSummary,
      settings,
    });

    try {
      // Phase 1 — gate criterion
      dispatchPhaseStart(runId, "c01");
      const c01 = await runC01(answers, settings);
      finalResult.criteria.c01 = c01.results.c01;
      dispatchPhaseComplete(runId, "c01", c01.results.c01, { c01: c01.results.c01 });

      if (!c01.passed) {
        console.log("[LexiSpeak Scoring] Scoring complete (gate failed).");
        dispatchScoringEvent("lexispeak:scoring-gate-failed", {
          runId,
          criterionId: "c01",
          result: c01.results.c01,
          partialResult: finalResult,
        });
        dispatchScoringEvent("lexispeak:scoring-complete", finalResult);
        return finalResult;
      }

      // Phase 2
      dispatchPhaseStart(runId, "c02");
      const c02 = await runC02(answers, settings);
      finalResult.criteria.c02 = c02;
      dispatchPhaseComplete(runId, "c02", c02, { c01: finalResult.criteria.c01, c02 });

      // Phase 3
      dispatchPhaseStart(runId, "c03");
      const c03 = await runC03(answers, settings);
      finalResult.criteria.c03 = c03;
      dispatchPhaseComplete(runId, "c03", c03, { c01: finalResult.criteria.c01, c02: finalResult.criteria.c02, c03 });

      // Phase 4
      dispatchPhaseStart(runId, "c04");
      const c04 = await runC04(answers, settings);
      finalResult.criteria.c04 = c04;
      dispatchPhaseComplete(runId, "c04", c04, { c01: finalResult.criteria.c01, c02: finalResult.criteria.c02, c03: finalResult.criteria.c03, c04 });

      console.log("[LexiSpeak Scoring] Scoring complete.", finalResult);
      dispatchScoringEvent("lexispeak:scoring-complete", finalResult);
      return finalResult;

    } catch (err) {
      console.error("[LexiSpeak Scoring] Scoring error:", err);
      dispatchScoringEvent("lexispeak:scoring-error", {
        runId,
        error: String(err?.message || err),
        partialResult: finalResult,
      });
      return finalResult;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.lexi.speak.scoring = {
    run,
    collectAnswers,
  };
})();
