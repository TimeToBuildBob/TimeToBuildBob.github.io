/**
 * Interactive Calculator
 * Vanilla JavaScript calculator with event delegation and keyboard support
 */

(function() {
  'use strict';

  // Calculator state
  let currentInput = '0';
  let previousInput = '';
  let operator = null;
  let shouldResetScreen = false;

  // DOM references
  let display = null;
  let buttonContainer = null;

  /**
   * Update the calculator display with current input
   */
  function updateDisplay() {
    if (display) {
      display.textContent = currentInput;
    }
  }

  /**
   * Append a number to the current input
   * @param {string} number - The digit to append
   */
  function appendNumber(number) {
    // Reset screen after operator or equals
    if (shouldResetScreen) {
      currentInput = number;
      shouldResetScreen = false;
    } else if (currentInput === '0' && number !== '.') {
      // Replace leading zero
      currentInput = number;
    } else if (currentInput === 'Error') {
      // Clear error state on new input
      currentInput = number;
    } else {
      currentInput += number;
    }
    updateDisplay();
  }

  /**
   * Handle decimal point input
   */
  function appendDecimal() {
    if (shouldResetScreen) {
      currentInput = '0.';
      shouldResetScreen = false;
      updateDisplay();
      return;
    }

    // Prevent multiple decimal points
    if (currentInput.includes('.')) {
      return;
    }

    // Handle error state
    if (currentInput === 'Error') {
      currentInput = '0.';
    } else {
      currentInput += '.';
    }
    updateDisplay();
  }

  /**
   * Choose an operator and prepare for second operand
   * @param {string} op - The operator (+, -, *, /)
   */
  function chooseOperator(op) {
    // Handle error state
    if (currentInput === 'Error') {
      return;
    }

    // If operator already set and not waiting for input, chain calculation
    if (operator !== null && !shouldResetScreen) {
      calculate();
    }

    previousInput = currentInput;
    operator = op;
    shouldResetScreen = true;
  }

  /**
   * Perform the calculation based on stored operator
   */
  function calculate() {
    // Nothing to calculate
    if (operator === null || previousInput === '') {
      return;
    }

    // If waiting for second operand, use current as both operands
    const prev = parseFloat(previousInput);
    const current = parseFloat(currentInput);
    let result;

    switch (operator) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '*':
        result = prev * current;
        break;
      case '/':
        if (current === 0) {
          currentInput = 'Error';
          previousInput = '';
          operator = null;
          shouldResetScreen = true;
          updateDisplay();
          return;
        }
        result = prev / current;
        break;
      default:
        return;
    }

    // Handle floating point precision (round to 10 decimal places)
    result = Math.round(result * 1e10) / 1e10;

    // Handle very large or very small numbers
    if (Math.abs(result) > 1e12) {
      currentInput = result.toExponential(6);
    } else {
      currentInput = String(result);
    }

    // Reset state for next calculation
    previousInput = '';
    operator = null;
    shouldResetScreen = true;
    updateDisplay();
  }

  /**
   * Clear calculator state and reset display
   */
  function clear() {
    currentInput = '0';
    previousInput = '';
    operator = null;
    shouldResetScreen = false;
    updateDisplay();
  }

  /**
   * Delete the last character (backspace functionality)
   */
  function deleteLastChar() {
    if (shouldResetScreen || currentInput === 'Error') {
      currentInput = '0';
      shouldResetScreen = false;
    } else if (currentInput.length === 1) {
      currentInput = '0';
    } else {
      currentInput = currentInput.slice(0, -1);
    }
    updateDisplay();
  }

  /**
   * Handle button click via event delegation
   * @param {Event} e - Click event
   */
  function handleButtonClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const value = button.dataset.value;

    switch (action) {
      case 'number':
        appendNumber(value);
        break;
      case 'operator':
        chooseOperator(value);
        break;
      case 'decimal':
        appendDecimal();
        break;
      case 'equals':
        calculate();
        break;
      case 'clear':
        clear();
        break;
      default:
        // Unknown action, ignore
        break;
    }
  }

  /**
   * Handle keyboard input
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleKeyboard(e) {
    const key = e.key;

    // Number keys
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      appendNumber(key);
      return;
    }

    // Operators
    if (['+', '-', '*', '/'].includes(key)) {
      e.preventDefault();
      chooseOperator(key);
      return;
    }

    // Other keys
    switch (key) {
      case '.':
      case ',': // Support comma as decimal on some keyboards
        e.preventDefault();
        appendDecimal();
        break;
      case 'Enter':
      case '=':
        e.preventDefault();
        calculate();
        break;
      case 'Escape':
      case 'c':
      case 'C':
        e.preventDefault();
        clear();
        break;
      case 'Backspace':
        e.preventDefault();
        deleteLastChar();
        break;
    }
  }

  /**
   * Initialize the calculator
   */
  function init() {
    // Get DOM elements
    display = document.getElementById('display') || document.querySelector('.display');
    buttonContainer = document.querySelector('.calculator-buttons');

    if (!display) {
      console.error('Calculator: Display element not found');
      return;
    }

    if (!buttonContainer) {
      console.error('Calculator: Button container not found');
      return;
    }

    // Event delegation for button clicks
    buttonContainer.addEventListener('click', handleButtonClick);

    // Keyboard support
    document.addEventListener('keydown', handleKeyboard);

    // Initialize display
    updateDisplay();

    console.log('Calculator initialized');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing (optional)
  window.Calculator = {
    appendNumber,
    chooseOperator,
    calculate,
    clear,
    getState: function() {
      return {
        currentInput,
        previousInput,
        operator,
        shouldResetScreen
      };
    }
  };
})();
