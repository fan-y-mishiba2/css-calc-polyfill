const CALC_REG = /\bcalc\(([\s\S]+)\)/;
const PERCENT = /[\d.]+%/;
const VIEWPORT_WIDTH = /[\d.]+vw/;
const VIEWPORT_HEIGHT = /[\d.]+vh/;
const PIXEL = /(\d+)px/g;
const REM = /[\d.]+rem/;
const EM = /[\d.]+em/;
const MATH_EXP = /[+\-/*]?[\d.]+(px|%|em|rem|vw|vh)?/g;
const PLACEHOLDER = '$1';
const ONLYNUMBERS = /[\s\-0-9]/g;
const QUOTE = /["']/g;
const FONTSIZE = 'font-size';

const toArray = Function.prototype.call.bind(Array.prototype.slice);
const camelize = str => str.replace(/-(\w)/g, (match, letter) => letter.toUpperCase());
const getStyle = (el, prop) => window.getComputedStyle(el, null).getPropertyValue(prop);

let options;
let hits = [];

const doCalc = (rule, name, value) => {
  const calcMatches = value.match(CALC_REG);
  if (!calcMatches) return;

  const media = rule.parentRule && rule.parentRule.media;
  if (media && !window.matchMedia(media.mediaText).matches) return;

  const calcPart = calcMatches[0];
  const formula = calcMatches[1];
  const matches = formula.match(MATH_EXP);
  let elements;
  try {
    elements = toArray(document.querySelectorAll(rule.selectorText));
  } catch (ex) {} // eslint-disable-line no-empty
  if (!elements) return;

  elements.forEach((el) => {
    let currentFormula = formula.replace(PIXEL, PLACEHOLDER);

    matches.forEach((match) => {
      let refValue;
      let modifier;

      if (match.match(PERCENT)) {
        refValue = name === 'height' ? el.parentNode.clientHeight : el.parentNode.clientWidth;
        modifier = parseFloat(match, 10) / 100;
      } else if (match.match(VIEWPORT_WIDTH)) {
        refValue = window.innerHeight;
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
        const result = eval(`(${currentFormula})`); // eslint-disable-line no-eval
        el.style[camelize(name)] = value.replace(calcPart, `${result}px`);
      } catch (ex) {} // eslint-disable-line no-empty
    }
  });
};

const processStylesheet = (ss) => {
  // cssRules respects same-origin policy, as per
  // https://code.google.com/p/chromium/issues/detail?id=49001#c10.
  try {
    if (!ss.cssRules) return null;
  } catch (e) {
    if (e.name !== 'SecurityError') { throw e; }
    return null;
  }
  return toArray(ss.cssRules);
};

const processDeclarations = (rule) => {
  if (!rule.style) {
    if (rule.cssRules) {
      toArray(rule.cssRules).forEach((r) => {
        processDeclarations(r);
      });
    }
    return;
  }

  const content = rule.style.getPropertyValue('content');
  if (!content || content.indexOf(options.contentPrefix) === -1) return;

  const fakeRules = content.replace(QUOTE, '');
  fakeRules.split(';').forEach((fakeRuleElement) => {
    const fakeRule = fakeRuleElement.split(':');
    if (fakeRule.length !== 2) return;

    const name = fakeRule[0].trim();
    const value = fakeRule[1].trim();
    if (CALC_REG.test(value)) {
      hits.push({ rule, name, value });
    }
  });
};

const refresh = () => {
  hits.forEach((hit) => {
    doCalc(hit.rule, hit.name, hit.value);
  });
};

const process = () => {
  hits = [];
  toArray(document.styleSheets).forEach((sheet) => {
    const cssRules = processStylesheet(sheet);
    if (!cssRules) return;
    if (sheet.media && sheet.media.mediaText
      && window.matchMedia
      && !window.matchMedia(sheet.media.mediaText).matches) return;

    cssRules.forEach(processDeclarations);
  });
  refresh();
};

const init = (opts) => {
  options = opts || {};
  options.contentPrefix = options.contentPrefix || 'calc-polyfill;';
};

module.exports = {
  init,
  process,
  refresh,
  doCalc,
};
