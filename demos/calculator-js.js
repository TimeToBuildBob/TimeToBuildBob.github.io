/**
 * Interactive Calculator Demo
 * Basic arithmetic calculator with state management
 */

(function() {
  'use strict';

  // Calculator state
  const state = {
    currentInput: '0',
    previousInput: '',
    operator: null,
    waitingForOperand: false
  };

  // DOM elements (supports both naming conventions)
  const display = document.querySelector('#display') || document.querySelector('.display');
  const numberButtons = document.querySelectorAll('.btn-num, .btn-number');
  const operatorButtons = document.querySelectorAll('.btn-op, .btn-operator');
  const equalsButton = document.querySelector('#btn-equals') || document.querySelector('.btn-equals');
  const clearButton = document.querySelector('#btn-clear') || document.querySelector('.btn-clear');
  const decimalButton = document.querySelector('#btn-decimal');

  /**
   * Update the calculator display
   */
  function updateDisplay() {
    if (display) {
      display.textContent = state.currentInput;
    }
  }

  /**
   * Handle number button clicks
   * @param {string} digit - The digit pressed
   */
  function inputNumber(digit) {
    if (state.waitingForOperand) {
      state.currentInput = digit;
      state.waitingForOperand = false;
    } else {
      // Replace initial 0 or append digit
      state.currentInput = state.currentInput === '0'
        ? digit
        : state.currentInput + digit;
    }
    updateDisplay();
  }

  /**
   * Handle decimal point input
   */
  function inputDecimal() {
    if (state.waitingForOperand) {
      state.currentInput = '0.';
      state.waitingForOperand = false;
      updateDisplay();
      return;
    }

    // Only add decimal if not already present
    if (!state.currentInput.includes('.')) {
      state.currentInput += '.';
      updateDisplay();
    }
  }

  /**
   * Perform arithmetic calculation
   * @param {number} a - First operand
   * @param {number} b - Second operand
   * @param {string} op - Operator
   * @returns {number|string} - Result or error message
   */
  function calculate(a, b, op) {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        if (b === 0) {
          return 'Error';
        }
        return a / b;
      default:
        return b;
    }
  }

  /**
   * Handle operator button clicks
   * @param {string} nextOperator - The operator pressed
   */
  function inputOperator(nextOperator) {
    const inputValue = parseFloat(state.currentInput);

    // If we already have an operator and are not waiting for operand, calculate first
    if (state.operator && !state.waitingForOperand) {
      const result = calculate(
        parseFloat(state.previousInput),
        inputValue,
        state.operator
      );

      if (result === 'Error') {
        state.currentInput = 'Error';
        state.previousInput = '';
        state.operator = null;
        state.waitingForOperand = true;
        updateDisplay();
        return;
      }

      state.currentInput = String(result);
      state.previousInput = state.currentInput;
    } else {
      state.previousInput = state.currentInput;
    }

    state.operator = nextOperator;
    state.waitingForOperand = true;
    updateDisplay();
  }

  /**
   * Handle equals button click - compute final result
   */
  function computeResult() {
    if (!state.operator || state.waitingForOperand) {
      return;
    }

    const inputValue = parseFloat(state.currentInput);
    const result = calculate(
      parseFloat(state.previousInput),
      inputValue,
      state.operator
    );

    if (result === 'Error') {
      state.currentInput = 'Error';
    } else {
      // Round to avoid floating point precision issues
      state.currentInput = String(Math.round(result * 1000000000) / 1000000000);
    }

    state.previousInput = '';
    state.operator = null;
    state.waitingForOperand = true;
    updateDisplay();
  }

  /**
   * Clear calculator state and reset display
   */
  function clearCalculator() {
    state.currentInput = '0';
    state.previousInput = '';
    state.operator = null;
    state.waitingForOperand = false;
    updateDisplay();
  }

  /**
   * Initialize event listeners
   */
  function init() {
    // Number button handlers
    numberButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        const value = this.dataset.num || this.dataset.value || this.textContent;
        if (value === '.') {
          inputDecimal();
        } else {
          inputNumber(value);
        }
      });
    });

    // Decimal button handler (if separate button exists)
    if (decimalButton) {
      decimalButton.addEventListener('click', inputDecimal);
    }

    // Operator button handlers
    operatorButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        const op = this.dataset.op || this.dataset.operator || this.textContent;
        inputOperator(op);
      });
    });

    // Equals button handler
    if (equalsButton) {
      equalsButton.addEventListener('click', computeResult);
    }

    // Clear button handler
    if (clearButton) {
      clearButton.addEventListener('click', clearCalculator);
    }

    // Keyboard support
    document.addEventListener('keydown', function(event) {
      const key = event.key;

      if (/^[0-9]$/.test(key)) {
        inputNumber(key);
      } else if (key === '.') {
        inputDecimal();
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        inputOperator(key);
      } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        computeResult();
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clearCalculator();
      } else if (key === 'Backspace') {
        // Allow backspace to delete last character
        if (!state.waitingForOperand && state.currentInput.length > 1) {
          state.currentInput = state.currentInput.slice(0, -1);
        } else {
          state.currentInput = '0';
        }
        updateDisplay();
      }
    });

    // Initialize display
    updateDisplay();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
