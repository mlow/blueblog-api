import { __assign } from './tslib.js';
import { pascalCaseTransform, pascalCaseTransformMerge, pascalCase } from './pascal-case.js';

function camelCaseTransform(input, index) {
  if (index === 0) return input.toLowerCase();
  return pascalCaseTransform(input, index);
}

function camelCaseTransformMerge(input, index) {
  if (index === 0) return input.toLowerCase();
  return pascalCaseTransformMerge(input);
}

function camelCase(input, options) {
  if (options === void 0) {
    options = {};
  }

  return pascalCase(input, __assign({
    transform: camelCaseTransform
  }, options));
}

export { camelCase, camelCaseTransform, camelCaseTransformMerge };
export default null;
