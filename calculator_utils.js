const safeMath = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  PI: Math.PI,
  E: Math.E,
  pow: Math.pow,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max
};

const preprocessExpression = (expr) =>
  expr
    .replace(/\^/g, '**')
    .replace(/(\d)([a-z])/gi, '$1*$2')
    .replace(/\)(\d)/g, ')*$1')
    .replace(/(\d)\(/g, '$1*(')
    .replace(/\)\(/g, ')*(')
    .replace(/pi/gi, 'PI')
    .replace(/e(?![a-df-z])/gi, 'E');

export const buildVariableContext = (variables = []) => {
  const context = {};
  variables.forEach((variable) => {
    if (typeof variable?.name === 'string' && typeof variable?.value === 'number') {
      context[variable.name] = variable.value;
    }
  });
  return context;
};

export const evaluateExpressionSimple = (
  expr,
  xValue,
  {
    independentVar = 'x',
    variables = []
  } = {}
) => {
  try {
    const processedExpr = preprocessExpression(expr);
    const varContext = buildVariableContext(variables);
    const allContext = { ...safeMath, ...varContext, [independentVar]: xValue };
    const func = new Function(...Object.keys(allContext), `return ${processedExpr}`);
    const result = func(...Object.values(allContext));
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

export const evaluateExpression = (
  expr,
  xValue,
  {
    independentVar = 'x',
    currentFuncId = null,
    functions = [],
    variables = []
  } = {}
) => {
  try {
    let processedExpr = expr;

    functions.forEach((func) => {
      if (!func || func.id === currentFuncId || func.visible === false) {
        return;
      }

      const funcName = func.dependentVar || 'f';
      const funcIndepVar = func.independentVar || 'x';
      const funcPattern = new RegExp(`${funcName}\\(([^)]+)\\)`, 'g');

      processedExpr = processedExpr.replace(funcPattern, (match, innerExpr) => {
        try {
          const innerValue = evaluateExpression(innerExpr, xValue, {
            independentVar,
            currentFuncId,
            functions,
            variables
          });

          if (innerValue === null) {
            return match;
          }

          const funcValue = evaluateExpressionSimple(func.expr, innerValue, {
            independentVar: funcIndepVar,
            variables
          });

          return funcValue !== null ? funcValue : match;
        } catch {
          return match;
        }
      });
    });

    processedExpr = preprocessExpression(processedExpr);
    const varContext = buildVariableContext(variables);
    const allContext = { ...safeMath, ...varContext, [independentVar]: xValue };
    const func = new Function(...Object.keys(allContext), `return ${processedExpr}`);
    const result = func(...Object.values(allContext));
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

export const numericalDerivative = (
  expr,
  xValue,
  {
    independentVar = 'x',
    currentFuncId = null,
    functions = [],
    variables = [],
    h = 0.0001
  } = {}
) => {
  const f1 = evaluateExpression(expr, xValue + h, {
    independentVar,
    currentFuncId,
    functions,
    variables
  });
  const f2 = evaluateExpression(expr, xValue - h, {
    independentVar,
    currentFuncId,
    functions,
    variables
  });

  if (f1 === null || f2 === null) {
    return null;
  }

  return (f1 - f2) / (2 * h);
};

export default {
  safeMath,
  buildVariableContext,
  evaluateExpression,
  evaluateExpressionSimple,
  numericalDerivative
};
