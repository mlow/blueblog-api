/**
Escape RegExp special characters.
You can also use this to escape a string that is inserted into the middle of a regex, for example, into a character class.
@example
```
import escapeStringRegexp = require('escape-string-regexp');
const escapedString = escapeStringRegexp('How much $ for a 🦄?');
//=> 'How much \\$ for a 🦄\\?'
new RegExp(escapedString);
```
*/
const escapeStringRegexp = string => {
  if (typeof string !== 'string') {
    throw new TypeError('Expected a string');
  } // Escape characters with special meaning either inside or outside character sets.
  // Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.


  return string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
};

const extractPathRegex = /\s+at.*[(\s](.*)\)?/;
const pathRegex = /^(?:(?:(?:node|(?:internal\/[\w/]*|.*node_modules\/(?:babel-polyfill|pirates)\/.*)?\w+)\.js:\d+:\d+)|native)/;
/**
Clean up error stack traces. Removes the mostly unhelpful internal Node.js entries.
@param stack - The `stack` property of an `Error`.
@example
```
import cleanStack = require('clean-stack');
const error = new Error('Missing unicorn');
console.log(error.stack);
// Error: Missing unicorn
//     at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
//     at Module._compile (module.js:409:26)
//     at Object.Module._extensions..js (module.js:416:10)
//     at Module.load (module.js:343:32)
//     at Function.Module._load (module.js:300:12)
//     at Function.Module.runMain (module.js:441:10)
//     at startup (node.js:139:18)
console.log(cleanStack(error.stack));
// Error: Missing unicorn
//     at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
```
*/

const cleanStack = (stack, basePath) => {
  const basePathRegex = basePath && new RegExp(`(at | \\()${escapeStringRegexp(basePath)}`, 'g');
  return stack.replace(/\\/g, '/').split('\n').filter(line => {
    const pathMatches = line.match(extractPathRegex);

    if (pathMatches === null || !pathMatches[1]) {
      return true;
    }

    const match = pathMatches[1]; // Electron

    if (match.includes('.app/Contents/Resources/electron.asar') || match.includes('.app/Contents/Resources/default_app.asar')) {
      return false;
    }

    return !pathRegex.test(match);
  }).filter(line => line.trim() !== '').map(line => {
    if (basePathRegex) {
      line = line.replace(basePathRegex, '$1');
    }

    return line;
  }).join('\n');
};

const cleanInternalStack = stack => stack.replace(/\s+at .*aggregate-error\/index.js:\d+:\d+\)?/g, '');
/**
Indent each line in a string.
@param string - The string to indent.
@param count - How many times you want `options.indent` repeated. Default: `1`.
@example
```
import indentString = require('indent-string');
indentString('Unicorns\nRainbows', 4);
//=> '    Unicorns\n    Rainbows'
indentString('Unicorns\nRainbows', 4, {indent: '♥'});
//=> '♥♥♥♥Unicorns\n♥♥♥♥Rainbows'
```
*/


const indentString = (string, count = 1, options) => {
  options = {
    indent: ' ',
    includeEmptyLines: false,
    ...options
  };

  if (typeof string !== 'string') {
    throw new TypeError(`Expected \`input\` to be a \`string\`, got \`${typeof string}\``);
  }

  if (typeof count !== 'number') {
    throw new TypeError(`Expected \`count\` to be a \`number\`, got \`${typeof count}\``);
  }

  if (count < 0) {
    throw new RangeError(`Expected \`count\` to be at least 0, got \`${count}\``);
  }

  if (typeof options.indent !== 'string') {
    throw new TypeError(`Expected \`options.indent\` to be a \`string\`, got \`${typeof options.indent}\``);
  }

  if (count === 0) {
    return string;
  }

  const regex = options.includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;
  return string.replace(regex, options.indent.repeat(count));
};

class AggregateError extends Error {
  /**
  @param errors - If a string, a new `Error` is created with the string as the error message. If a non-Error object, a new `Error` is created with all properties from the object copied over.
  @returns An Error that is also an [`Iterable`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators#Iterables) for the individual errors.
  @example
  ```
  import AggregateError = require('aggregate-error');
  const error = new AggregateError([new Error('foo'), 'bar', {message: 'baz'}]);
  throw error;
  // AggregateError:
  //	Error: foo
  //		at Object.<anonymous> (/Users/sindresorhus/dev/aggregate-error/example.js:3:33)
  //	Error: bar
  //		at Object.<anonymous> (/Users/sindresorhus/dev/aggregate-error/example.js:3:13)
  //	Error: baz
  //		at Object.<anonymous> (/Users/sindresorhus/dev/aggregate-error/example.js:3:13)
  //	at AggregateError (/Users/sindresorhus/dev/aggregate-error/index.js:19:3)
  //	at Object.<anonymous> (/Users/sindresorhus/dev/aggregate-error/example.js:3:13)
  //	at Module._compile (module.js:556:32)
  //	at Object.Module._extensions..js (module.js:565:10)
  //	at Module.load (module.js:473:32)
  //	at tryModuleLoad (module.js:432:12)
  //	at Function.Module._load (module.js:424:3)
  //	at Module.runMain (module.js:590:10)
  //	at run (bootstrap_node.js:394:7)
  //	at startup (bootstrap_node.js:149:9)
  for (const individualError of error) {
      console.log(individualError);
  }
  //=> [Error: foo]
  //=> [Error: bar]
  //=> [Error: baz]
  ```
  */
  constructor(errors) {
    if (!Array.isArray(errors)) {
      throw new TypeError(`Expected input to be an Array, got ${typeof errors}`);
    }

    const normalizedErrors = errors.map(error => {
      if (error instanceof Error) {
        return error;
      }

      if (error !== null && typeof error === 'object') {
        // Handle plain error objects with message property and/or possibly other metadata
        return Object.assign(new Error(error.message), error);
      }

      return new Error(error);
    });
    let message = normalizedErrors.map(error => {
      // The `stack` property is not standardized, so we can't assume it exists
      return typeof error.stack === 'string' ? cleanInternalStack(cleanStack(error.stack)) : String(error);
    }).join('\n');
    message = '\n' + indentString(message, 4);
    super(message);
    this.name = 'AggregateError';
    Object.defineProperty(this, '_errors', {
      value: normalizedErrors
    });
  }

  *[Symbol.iterator]() {
    for (const error of this._errors) {
      yield error;
    }
  }

}

export default AggregateError;