'use strict';

var CALC_REG = /\bcalc\(([\s\S]+)\)/;
var PERCENT = /[\d.]+%/;
var VIEWPORT_WIDTH = /[\d.]+vw/;
var VIEWPORT_HEIGHT = /[\d.]+vh/;
var PIXEL = /(\d+)px/g;
var REM = /[\d.]+rem/;
var EM = /[\d.]+em/;
var MATH_EXP = /[+\-/*]?[\d.]+(px|%|em|rem|vw|vh)?/g;
var PLACEHOLDER = '$1';
var ONLYNUMBERS = /[\s\-0-9]/g;
var QUOTE = /["']/g;
var FONTSIZE = 'font-size';

var toArray = Function.prototype.call.bind(Array.prototype.slice);
var camelize = function camelize(str) {
  return str.replace(/-(\w)/g, function (match, letter) {
    return letter.toUpperCase();
  });
};
var getStyle = function getStyle(el, prop) {
  return window.getComputedStyle(el, null).getPropertyValue(prop);
};

var options = void 0;

var doCalc = function doCalc(rule, name, value) {
  var calcMatches = value.match(CALC_REG);
  if (!calcMatches) return;

  var media = rule.parentRule && rule.parentRule.media;
  if (media && !window.matchMedia(media.mediaText).matches) return;

  var calcPart = calcMatches[0];
  var formula = calcMatches[1];
  var matches = formula.match(MATH_EXP);
  var elements = void 0;
  try {
    elements = toArray(document.querySelectorAll(rule.selectorText));
  } catch (ex) {} // eslint-disable-line no-empty
  if (!elements) return;

  elements.forEach(function (el) {
    var currentFormula = formula.replace(PIXEL, PLACEHOLDER);

    matches.forEach(function (match) {
      var refValue = void 0;
      var modifier = void 0;

      if (match.match(PERCENT)) {
        refValue = el.parentNode.clientWidth;
        modifier = parseFloat(match, 10) / 100;
      } else if (match.match(VIEWPORT_WIDTH)) {
        refValue = window.innerWidth;
        modifier = parseFloat(match) / 100;
      } else if (match.match(VIEWPORT_HEIGHT)) {
        refValue = window.innerHeight;
        modifier = parseFloat(match) / 100;
      } else if (match.match(EM)) {
        refValue = parseFloat(getStyle(el, FONTSIZE).replace(/px/, ''));
        modifier = parseFloat(match);
      } else if (match.match(REM)) {
        refValue = parseFloat(getStyle(document.body, FONTSIZE).replace(/px/, ''));
        modifier = parseFloat(match);
      }

      if (modifier) {
        currentFormula = currentFormula.replace(match, refValue * modifier);
      }
    });

    if (currentFormula.match(ONLYNUMBERS)) {
      try {
        var result = eval('(' + currentFormula + ')'); // eslint-disable-line no-eval
        el.style[camelize(name)] = value.replace(calcPart, result + 'px');
      } catch (ex) {} // eslint-disable-line no-empty
    }
  });
};

var processStylesheet = function processStylesheet(ss) {
  // cssRules respects same-origin policy, as per
  // https://code.google.com/p/chromium/issues/detail?id=49001#c10.
  try {
    if (!ss.cssRules) return null;
  } catch (e) {
    if (e.name !== 'SecurityError') {
      throw e;
    }
    return null;
  }
  return toArray(ss.cssRules);
};

var processDeclarations = function processDeclarations(rule) {
  if (!rule.style) {
    if (rule.cssRules) {
      toArray(rule.cssRules).forEach(function (r) {
        processDeclarations(r);
      });
    }
    return;
  }

  var content = rule.style.getPropertycontent('content');
  if (!content || content.indexOf(options.contentPrefix) !== 0) return;

  var fakeRules = content.replace(QUOTE, '');
  fakeRules.split(';').forEach(function (fakeRuleElement) {
    var fakeRule = fakeRuleElement.split(':');
    if (fakeRule.length !== 2) return;

    var name = fakeRule[0].trim();
    var value = fakeRule[1].trim();
    if (CALC_REG.test(value)) {
      doCalc(rule, name, value);
    }
  });
};

var process = function process() {
  toArray(document.styleSheets).forEach(function (sheet) {
    var cssRules = processStylesheet(sheet);
    if (!cssRules) return;
    if (sheet.media && sheet.media.mediaText && window.matchMedia && !window.matchMedia(sheet.media.mediaText).matches) return;

    cssRules.forEach(processDeclarations);
  });
};

var init = function init(opts) {
  options = opts || {};
  options.contentPrefix = options.contentPrefix || 'calc-polyfill;';
};

module.exports = {
  init: init,
  process: process,
  doCalc: doCalc
};