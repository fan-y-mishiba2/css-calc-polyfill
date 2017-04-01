'use strict';

var CALC_REG = /calc\(([\s\S]+)\)/;
var PERCENT = /[\d.]+%/;
var VIEWPORT_WIDTH = /[\d.]+vw/;
var VIEWPORT_HEIGHT = /[\d.]+vh/;
var PIXEL = /(\d+)px/g;
var REM = /[\d.]+rem/;
var EM = /[\d.]+em/;
var MATH_EXP = /[+\-/*]?[\d.]+(px|%|em|rem|vw|vh)?/g;
var PLACEHOLDER = '$1';
var ONLYNUMBERS = /[\s\-0-9]/g;
var FONTSIZE = 'font-size';

var camelize = function camelize(str) {
  return str.replace(/-(\w)/g, function (match, letter) {
    return letter.toUpperCase();
  });
};
var getStyle = function getStyle(el, prop) {
  return window.getComputedStyle(el, null).getPropertyValue(prop);
};
// http://stackoverflow.com/questions/1955048/get-computed-font-size-for-dom-element-in-js
// const getFontsize = el => {
//   let size;
//   const elTest = document.createElement('span');
//
//   elTest.innerHTML = '&nbsp;';
//   elTest.style.position = 'absolute';
//   elTest.style.lineHeight = '1em';
//   elTest.style.fontSize = '1em';
//
//   el.appendChild(elTest);
//   size = elTest.offsetHeight;
//   el.removeChild(elTest);
//
//   return size;
// };

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
    elements = Array.prototype.slice.call(document.querySelectorAll(rule.selectorText), 0);
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

module.exports = {
  doCalc: doCalc
};