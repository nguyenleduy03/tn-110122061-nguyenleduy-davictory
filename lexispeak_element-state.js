/**
 * Element State Control Utility
 *
 * Provides functions to disable/enable elements with visual feedback.
 * Supports "locked" disabled state that prevents mass re-enabling.
 *
 * Usage:
 * // Disable an element (can be re-enabled later)
 * window.lexi.utils.disableElement('.my-button');
 *
 * // Disable an element permanently (locked - won't be re-enabled by mass enable)
 * window.lexi.utils.disableElement('.my-button', true);
 *
 * // Enable an element (respects locked state by default)
 * window.lexi.utils.enableElement('.my-button');
 *
 * // Force enable even if locked
 * window.lexi.utils.enableElement('.my-button', true);
 *
 * // Check if element is locked
 * window.lexi.utils.isElementLocked('.my-button');
 */

(function () {
  const DISABLED_CLASS = "lx-disabled";
  const LOCKED_ATTR = "data-disabled-locked";

  /**
   * Disable element(s) matching the selector
   * @param {string} selector - CSS selector, ID, or class
   * @param {boolean} locked - If true, element won't be re-enabled by mass enable calls
   */
  window.lexi.utils.disableElement = function (selector, locked = false) {
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) {
      console.warn(`No elements found for selector: ${selector}`);
      return false;
    }

    elements.forEach((el) => {
      el.classList.add(DISABLED_CLASS);
      el.setAttribute("aria-disabled", "true");

      // Mark as locked if specified
      if (locked) {
        el.setAttribute(LOCKED_ATTR, "true");
      }

      // Also set disabled attribute for form elements
      if (
        el.tagName === "BUTTON" ||
        el.tagName === "INPUT" ||
        el.tagName === "SELECT" ||
        el.tagName === "TEXTAREA"
      ) {
        el.disabled = true;
      }
    });

    return true;
  };

  /**
   * Enable element(s) matching the selector
   * @param {string} selector - CSS selector, ID, or class
   * @param {boolean} force - If true, enable even if locked
   */
  window.lexi.utils.enableElement = function (selector, force = false) {
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) {
      console.warn(`No elements found for selector: ${selector}`);
      return false;
    }

    elements.forEach((el) => {
      // Skip locked elements unless force is true
      if (!force && el.hasAttribute(LOCKED_ATTR)) {
        return;
      }

      el.classList.remove(DISABLED_CLASS);
      el.removeAttribute("aria-disabled");

      // Remove locked attribute if forcing enable
      if (force) {
        el.removeAttribute(LOCKED_ATTR);
      }

      // Also remove disabled attribute for form elements
      if (
        el.tagName === "BUTTON" ||
        el.tagName === "INPUT" ||
        el.tagName === "SELECT" ||
        el.tagName === "TEXTAREA"
      ) {
        el.disabled = false;
      }
    });

    return true;
  };

  /**
   * Toggle element(s) disabled state
   * @param {string} selector - CSS selector, ID, or class
   * @param {boolean|null} force - Force enable (true) or disable (false), or toggle if null
   * @param {boolean} locked - If disabling, whether to lock the element
   */
  window.lexi.utils.toggleElement = function (
    selector,
    force = null,
    locked = false
  ) {
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) {
      console.warn(`No elements found for selector: ${selector}`);
      return false;
    }

    elements.forEach((el) => {
      const isDisabled = el.classList.contains(DISABLED_CLASS);
      const shouldDisable = force !== null ? !force : !isDisabled;

      if (shouldDisable) {
        window.lexi.utils.disableElement(`#${el.id}`, locked);
      } else {
        window.lexi.utils.enableElement(`#${el.id}`, true);
      }
    });

    return true;
  };

  /**
   * Check if element is disabled
   * @param {string} selector - CSS selector, ID, or class
   * @returns {boolean|null} - true if disabled, false if enabled, null if not found
   */
  window.lexi.utils.isElementDisabled = function (selector) {
    const element = document.querySelector(selector);

    if (!element) {
      console.warn(`No element found for selector: ${selector}`);
      return null;
    }

    return element.classList.contains(DISABLED_CLASS);
  };

  /**
   * Check if element is locked (permanently disabled)
   * @param {string} selector - CSS selector, ID, or class
   * @returns {boolean|null} - true if locked, false if not locked, null if not found
   */
  window.lexi.utils.isElementLocked = function (selector) {
    const element = document.querySelector(selector);

    if (!element) {
      console.warn(`No element found for selector: ${selector}`);
      return null;
    }

    return element.hasAttribute(LOCKED_ATTR);
  };

  /**
   * Unlock element(s) without enabling them
   * @param {string} selector - CSS selector, ID, or class
   */
  window.lexi.utils.unlockElement = function (selector) {
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) {
      console.warn(`No elements found for selector: ${selector}`);
      return false;
    }

    elements.forEach((el) => {
      el.removeAttribute(LOCKED_ATTR);
    });

    return true;
  };
})();