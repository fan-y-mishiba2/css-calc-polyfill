const CALC_REG = /calc\(([\s\S]+)\)/;
const PERCENT = /[\d.]+%/;
const VIEWPORT_WIDTH = /[\d.]+vw/;
const VIEWPORT_HEIGHT = /[\d.]+vh/;
const PIXEL = /(\d+)px/g;
const REM = /[\d.]+rem/;
const EM = /[\d.]+em/;
const MATH_EXP = /[+\-/*]?[\d.]+(px|%|em|rem|vw|vh)?/g;
const PLACEHOLDER = '$1';
const ONLYNUMBERS = /[\s\-0-9]/g;
const FONTSIZE = 'font-size';

const camelize = str => str.replace(/-(\w)/g, (match, letter) => letter.toUpperCase());
const getStyle = (el, prop) => window.getComputedStyle(el, null).getPropertyValue(prop);

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
    elements = Array.prototype.slice.call(document.querySelectorAll(rule.selectorText), 0);
  } catch (ex) {} // eslint-disable-line no-empty
  if (!elements) return;

  elements.forEach((el) => {
    let currentFormula = formula.replace(PIXEL, PLACEHOLDER);

    matches.forEach((match) => {
      let refValue;
      let modifier;

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
        const result = eval(`(${currentFormula})`); // eslint-disable-line no-eval
        el.style[camelize(name)] = value.replace(calcPart, `${result}px`);
      } catch (ex) {} // eslint-disable-line no-empty
    }
  });
};

module.exports = {
  doCalc,
};
