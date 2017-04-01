# css-calc-polyfill

CSS3 `calc` polyfill.

This project is based on [calc-polyfill](https://github.com/closingtag/calc-polyfill)
and [viewport-units-buggyfill](https://github.com/rodneyrehm/viewport-units-buggyfill).
It aims to do `calc` polyfill by the `viewport-units-buggyfill` hack approach:

1. use [postcss-viewport-units](https://github.com/springuper/postcss-viewport-units) to
automatically append unsupported `calc` declarations to `content` declaration
2. init this polyfill so it could retrieve all preserved `calc` declarations
3. internally refresh so changed elements could get proper styles

## Install

```bash
$ npm install -D css-calc-polyfill
```

## Usage

```js
import { init, process, refresh } from 'css-calc-polyfill';

const refreshCalc = () => {
  setTimeout(() => {
    refresh();
    refreshCalc();
  }, 1000);
};

document.addEventListener('DOMContentLoaded', () => {
  init({
    contentPrefix: 'viewport-units-buggyfill;' // reuse `postcss-viewport-units` prefix
  });
  process(); // first run, also boot `calc` declaration cache
  refreshCalc(); // internally refresh element styles using cache
});
```

## License

MIT
