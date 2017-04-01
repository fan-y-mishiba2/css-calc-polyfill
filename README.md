# css-calc-polyfill

CSS3 `calc` polyfill.

This project is based on [calc-polyfill](https://github.com/closingtag/calc-polyfill),
but only providing one functionality: `doCalc`,
which means it doesn't handle css file/style content fetching, parsing, and watching.


## Install

```bash
$ npm install -D css-calc-polyfill
```

## Usage

```js
import { doCalc } from 'css-calc-polyfill';

document.addEventListener('DOMContentLoaded', () => {
  getAllCSSRules().forEach(rule => {
    Object.keys(rule.style).forEach(name => {
      doCalc(rule, name, rule.style.getPropertyValue(name));
    });
  });
});
```

## License

MIT
