/*!
 * viewport-units-buggyfill.hacks v0.6.1
 * @web: https://github.com/rodneyrehm/viewport-units-buggyfill/
 * @author: Zoltan Hawryluk - http://www.useragentman.com/
 */

(function(root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.viewportUnitsBuggyfillHacks = factory();
  }
}(this, function() {
  'use strict';

  var calcExpression = /calc\(/g;
  var quoteExpression = /["']/g;
  var userAgent = window.navigator.userAgent;
  var isBuggyIE = /MSIE [0-9]\./i.test(userAgent);

  // added check for IE10, IE11 and Edge < 20, since it *still* doesn't understand vmax
  // http://caniuse.com/#feat=viewport-units
  if (!isBuggyIE) {
    isBuggyIE = !!navigator.userAgent.match(/MSIE 10\.|Trident.*rv[ :]*1[01]\.| Edge\/1\d\./);
  }

  // iOS SAFARI, IE9, or Stock Android: abuse "content" if "viewport-units-buggyfill" specified
  function checkHacks(declarations, rule, name, value, options) {
    var needsHack = name === 'content' && value.indexOf('viewport-units-buggyfill') > -1;
    if (!needsHack) {
      return;
    }

    // reset content declaration
    declarations.push([rule, 'content', 'normal']);

    var fakeRules = value.replace(quoteExpression, '');
    fakeRules.split(';').forEach(function(fakeRuleElement) {
      var fakeRule = fakeRuleElement.split(':');
      if (fakeRule.length !== 2) {
        return;
      }

      var name = fakeRule[0].trim();
      if (name === 'viewport-units-buggyfill') {
        return;
      }

      var value = fakeRule[1].trim();
      declarations.push([rule, name, value]);
      if (calcExpression.test(value)) {
        if (!options || !options.calcPolyfill) {
          var webkitValue = value.replace(calcExpression, '-webkit-calc(');
          declarations.push([rule, name, webkitValue]);
        } else {
          options.calcPolyfill(rule, name, value);
        }
      }
    });
  }

  var calcPolyfill = (function () {
    var CALC_REG = /calc\(([\s\S]+)\)/;
    var PERCENT = /[\d\.]+%/;
    var VIEWPORT_WIDTH = /[\d\.]+vw/;
    var VIEWPORT_HEIGHT = /[\d\.]+vh/;
    var PT = /\d+pt/;
    var PIXEL = /(\d+)px/g;
    var REM = /[\d\.]+rem/;
    var EM = /[\d\.]+em/;
    var MATH_EXP = /[\+\-\/\*]?[\d\.]+(px|%|em|rem|vw|vh)?/g;
    var PLACEHOLDER = '$1';
    var ONLYNUMBERS = /[\s\-0-9]/g;

    var camelize = function (str) {
      return str.replace(/\-(\w)/g, function (str, letter) {
        return letter.toUpperCase();
      });
    };
    var getStyle = function (el, prop) {
      if (el.currentStyle) {
        return el.currentStyle[camelize(prop)];
      } else if (document.defaultView && document.defaultView.getComputedStyle) {
        return document.defaultView.getComputedStyle(el, null).getPropertyValue(prop);
      } else {
        return el.style[camelize(prop)];
      }
    };
    // http://stackoverflow.com/questions/1955048/get-computed-font-size-for-dom-element-in-js
    var getFontsize = function (obj) {
      var size;
      var test = document.createElement('span');

      test.innerHTML = '&nbsp;';
      test.style.position = 'absolute';
      test.style.lineHeight = '1em';
      test.style.fontSize = '1em';

      obj.appendChild(test);
      size = test.offsetHeight;
      obj.removeChild(test);

      return size;
    };

    var doCalc = function(rule, name, value) {
      console.log('===calc polyfill @2', rule, name, value);
      var calcMatches = value.match(CALC_REG);
      if (!calcMatches) return;

      var calcPart = calcMatches[0];
      var formula = calcMatches[1];
      var matches = formula.match(MATH_EXP);
      console.log('===calc polyfill @3', formula, matches);
      var elements;
      try {
        elements = document.querySelectorAll(rule.selectorText);
      } catch (ex) {}
      if (!elements) return;

      console.log('===calc polyfill @4', elements);
      var len = elements.length;
      var i;

      for (i = 0; i < len; i++) {
        // var formula = formula.replace(PIXEL, PLACEHOLDER);
        var elFormula = formula;
        var l = matches.length;
        var j;
        var refValue;
        var modifier;
        var result;

        for (j = 0; j < l; j++) {
          modifier = null;
          console.log('===calc polyfill @5', matches[j], matches[j].match(VIEWPORT_WIDTH), matches[j].match(VIEWPORT_HEIGHT));
          if (matches[j].match(PERCENT)) {
            refValue = elements[i].parentNode.clientWidth;
            modifier = parseFloat(matches[j], 10) / 100;
          }
          if (matches[j].match(VIEWPORT_WIDTH)) {
            refValue = window.innerWidth;
            modifier = parseFloat(matches[j], 10) / 100;
          }
          if (matches[j].match(VIEWPORT_HEIGHT)) {
            refValue = window.innerHeight;
            modifier = parseFloat(matches[j], 10) / 100;
          }
          if (matches[j].match(EM)) {
            refValue = elements[i].currentStyle
              ? getFontsize(obj.elements[i])
              : parseInt(getStyle(elements[i], FONTSIZE).replace(/px/, ''), 10);
            if (refValue.match && refValue.match(PT)) {
              refValue = Math.round(parseInt(refValue.replace(/pt/, ''), 10) * 1.333333333);
            }
            modifier = parseFloat(matches[j], 10);
          }

          if (matches[j].match(REM)) {
            if (getStyle(document.body, FONTSIZE).match(PERCENT)) {
              refValue = 16 * parseInt(getStyle(document.body, FONTSIZE).replace(/%/, ''), 10) / 100;
            }
            else if (getStyle(document.body, FONTSIZE).match(PT)) {
              refValue = Math.round(parseInt(getStyle(document.body, FONTSIZE).replace(/pt/, ''), 10) * 1.333333333);
            }
            else {
              refValue = parseInt(getStyle(document.body, FONTSIZE).replace(/px/, ''), 10);
            }
            modifier = parseFloat(matches[j], 10);
          }

          if (modifier) {
            console.log('===elFormula', modifier, refValue);
            elFormula = elFormula.replace(matches[j], refValue * modifier);
          }
        }

        console.log('===final elFormula', elFormula);

        try {
          if (elFormula.match(ONLYNUMBERS)) {
            result = eval(elFormula);
            console.log('===do the calc', result, elFormula, elements[i], name, value.replace(calcPart, result + 'px'));
            elements[i].style[camelize(name)] = value.replace(calcPart, result + 'px');
            // elements[i].setAttribute('data-calced', true);
          }
        }
        catch(e) {}
      }
    };

    return {
      doCalc: doCalc,
    };
  })();

  return {
    required: function(options) {
      return options.isMobileSafari || isBuggyIE;
    },

    initialize: function() {},

    initializeEvents: function(options, refresh, _refresh) {
      if (options.force) {
        return;
      }

      if (isBuggyIE && !options._listeningToResize) {
        window.addEventListener('resize', _refresh, true);
        options._listeningToResize = true;
      }
    },

    findDeclarations: function(declarations, rule, name, value, options) {
      if (name === null) {
        // KeyframesRule does not have a CSS-PropertyName
        return;
      }

      checkHacks(declarations, rule, name, value, options);
    },

    overwriteDeclaration: function(rule, name, _value) {
      if (isBuggyIE && name === 'filter') {
        // remove unit "px" from complex value, e.g.:
        // filter: progid:DXImageTransform.Microsoft.DropShadow(OffX=5.4px, OffY=3.9px, Color=#000000);
        _value = _value.replace(/px/g, '');
      }

      return _value;
    },
  };
}));
