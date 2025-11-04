import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateExpression,
  evaluateExpressionSimple,
  numericalDerivative
} from '../calculator_utils.js';

const baseVariables = [
  { name: 'pi', value: Math.PI },
  { name: 'a', value: 2 },
  { name: 'b', value: 0.5 },
  { name: 'c', value: 1 }
];

const baseFunctions = [
  {
    id: 1,
    expr: 'a*sin(b*x) + c',
    visible: true,
    independentVar: 'x',
    dependentVar: 'f'
  }
];

test('evaluateExpressionSimple handles implicit multiplication and constants', () => {
  const result = evaluateExpressionSimple('2pi + 3x', 4, {
    variables: baseVariables,
    independentVar: 'x'
  });
  const expected = 2 * Math.PI + 3 * 4;
  assert.ok(Math.abs(result - expected) < 1e-9);
});

test('evaluateExpression resolves references to other defined functions', () => {
  const value = evaluateExpression('f(x)', 2, {
    variables: baseVariables,
    functions: baseFunctions,
    independentVar: 'x'
  });

  const expected = evaluateExpressionSimple('a*sin(b*x) + c', 2, {
    variables: baseVariables,
    independentVar: 'x'
  });

  assert.ok(Math.abs(value - expected) < 1e-9);
});

test('evaluateExpression returns null for invalid expressions', () => {
  const result = evaluateExpression('1/(', 3, {
    variables: baseVariables,
    functions: baseFunctions,
    independentVar: 'x'
  });
  assert.equal(result, null);
});

test('numericalDerivative approximates analytical derivative', () => {
  const slope = numericalDerivative('sin(x)', Math.PI / 6, {
    variables: baseVariables,
    functions: [],
    independentVar: 'x',
    h: 1e-5
  });
  assert.ok(Math.abs(slope - Math.cos(Math.PI / 6)) < 1e-4);
});

test('numericalDerivative respects custom independent variable', () => {
  const derivative = numericalDerivative('u^3', 2, {
    independentVar: 'u',
    variables: baseVariables
  });

  assert.ok(Math.abs(derivative - 12) < 1e-3);
});
