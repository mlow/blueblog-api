import { __assign } from './tslib.js';
import { noCase } from './no-case.js';

function pascalCaseTransform(input, index) {
  var firstChar = input.charAt(0);
  var lowerChars = input.substr(1).toLowerCase();

  if (index > 0 && firstChar >= "0" && firstChar <= "9") {
    return "_" + firstChar + lowerChars;
  }

  return "" + firstChar.toUpperCase() + lowerChars;
}

function pascalCaseTransformMerge(input) {
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
}

function pascalCase(input, options) {
  if (options === void 0) {
    options = {};
  }

  return noCase(input, __assign({
    delimiter: "",
    transform: pascalCaseTransform
  }, options));
}

export { pascalCase, pascalCaseTransform, pascalCaseTransformMerge };
export default null;
