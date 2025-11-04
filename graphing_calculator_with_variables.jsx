import React, { useState, useEffect } from 'react';
import {
  evaluateExpression as evaluateExpressionUtil,
  evaluateExpressionSimple as evaluateExpressionSimpleUtil,
  numericalDerivative as numericalDerivativeUtil
} from './calculator_utils.js';

export default function GraphingCalculator() {
  const [functions, setFunctions] = useState([
    { id: 1, expr: 'a*sin(b*x) + c', derivative: '', color: '#3b82f6', visible: true, name: 'Function 1', independentVar: 'x', dependentVar: 'f' }
  ]);
  const [variables, setVariables] = useState([
    { name: 'pi', value: Math.PI, min: 0, max: 2 * Math.PI, step: 0.01, locked: true },
    { name: 'a', value: 1, min: -5, max: 5, step: 0.1 },
    { name: 'b', value: 1, min: -5, max: 5, step: 0.1 },
    { name: 'c', value: 0, min: -5, max: 5, step: 0.1 }
  ]);
  const [xPoint, setXPoint] = useState(Math.PI / 4);
  const [selectedFunction, setSelectedFunction] = useState(1);
  const [xMin, setXMin] = useState(-Math.PI);
  const [xMax, setXMax] = useState(3 * Math.PI);
  const [yMin, setYMin] = useState(-3);
  const [yMax, setYMax] = useState(3);
  const [showTangent, setShowTangent] = useState(true);
  const [error, setError] = useState('');
  const [newVarName, setNewVarName] = useState('');
  
  // Canvas dimensions
  const width = 900;
  const height = 500;
  const padding = 60;
  
  // Available colors for functions
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];
  
  const evaluateExpression = (expr, xValue, independentVar = 'x', currentFuncId = null) =>
    evaluateExpressionUtil(expr, xValue, {
      independentVar,
      currentFuncId,
      functions,
      variables
    });

  const evaluateExpressionSimple = (expr, xValue, independentVar = 'x') =>
    evaluateExpressionSimpleUtil(expr, xValue, {
      independentVar,
      variables
    });

  const numericalDerivative = (expr, xValue, independentVar = 'x', currentFuncId = null, h = 0.0001) =>
    numericalDerivativeUtil(expr, xValue, {
      independentVar,
      currentFuncId,
      functions,
      variables,
      h
    });
  
  // Scale factors
  const xScale = (width - 2 * padding) / (xMax - xMin);
  const yScale = (height - 2 * padding) / (yMax - yMin);
  
  // Convert math coordinates to canvas coordinates
  const toCanvasX = (x) => padding + (x - xMin) * xScale;
  const toCanvasY = (y) => height - padding - (y - yMin) * yScale;
  
  // Add new function
  const addFunction = () => {
    const newId = Math.max(...functions.map(f => f.id)) + 1;
    // Find next available function letter
    const usedLetters = functions.map(f => f.dependentVar || 'f');
    const letters = 'fghijklmnpqrstuvw';
    const nextLetter = letters.split('').find(l => !usedLetters.includes(l)) || 'f';
    
    setFunctions([...functions, {
      id: newId,
      expr: 'x^2',
      derivative: '',
      color: colors[functions.length % colors.length],
      visible: true,
      name: `Function ${newId}`,
      independentVar: 'x',
      dependentVar: nextLetter
    }]);
  };
  
  // Update function
  const updateFunction = (id, field, value) => {
    setFunctions(functions.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
    setError('');
  };
  
  // Delete function
  const deleteFunction = (id) => {
    if (functions.length > 1) {
      setFunctions(functions.filter(f => f.id !== id));
      if (selectedFunction === id) {
        setSelectedFunction(functions.find(f => f.id !== id).id);
      }
    }
  };
  
  // Add new variable
  const addVariable = () => {
    const reserved = ['pi', 'e', 'PI', 'E', 'x'];
    if (!newVarName) {
      setError('Please enter a variable name');
      return;
    }
    if (reserved.includes(newVarName.toLowerCase())) {
      setError(`'${newVarName}' is a reserved constant or variable`);
      return;
    }
    if (variables.find(v => v.name === newVarName)) {
      setError('Variable already exists');
      return;
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newVarName)) {
      setError('Invalid variable name (use letters, numbers, underscore)');
      return;
    }
    
    setVariables([...variables, {
      name: newVarName,
      value: 1,
      min: -10,
      max: 10,
      step: 0.1,
      locked: false
    }]);
    setNewVarName('');
    setError('');
  };
  
  // Update variable
  const updateVariable = (name, field, value) => {
    setVariables(variables.map(v => 
      v.name === name ? { ...v, [field]: parseFloat(value) } : v
    ));
  };
  
  // Delete variable
  const deleteVariable = (name) => {
    setVariables(variables.filter(v => v.name !== name));
  };
  
  // Generate function points
  const generatePoints = (expr, independentVar = 'x', funcId = null) => {
    const points = [];
    const step = (xMax - xMin) / 500;
    for (let x = xMin; x <= xMax; x += step) {
      const y = evaluateExpression(expr, x, independentVar, funcId);
      if (y !== null && y >= yMin && y <= yMax) {
        points.push(`${toCanvasX(x)},${toCanvasY(y)}`);
      } else if (points.length > 0) {
        // Break line for discontinuities
        points.push('M');
      }
    }
    return points;
  };
  
  // Calculate tangent line
  const getTangentPoints = (func) => {
    const independentVar = func.independentVar || 'x';
    const y0 = evaluateExpression(func.expr, xPoint, independentVar, func.id);
    if (y0 === null) return [];
    
    let slope;
    if (func.derivative && func.derivative.trim() !== '') {
      slope = evaluateExpression(func.derivative, xPoint, independentVar, func.id);
    } else {
      slope = numericalDerivative(func.expr, xPoint, independentVar, func.id);
    }
    
    if (slope === null) return [];
    
    const points = [];
    const tangentStart = xMin;
    const tangentEnd = xMax;
    for (let x = tangentStart; x <= tangentEnd; x += (xMax - xMin) / 100) {
      const y = slope * (x - xPoint) + y0;
      if (y >= yMin && y <= yMax) {
        points.push(`${toCanvasX(x)},${toCanvasY(y)}`);
      }
    }
    return points;
  };
  
  // Get grid step size
  const getGridStep = (range) => {
    const magnitude = Math.floor(Math.log10(range));
    const base = Math.pow(10, magnitude);
    const normalized = range / base;
    if (normalized <= 2) return base / 4;
    if (normalized <= 5) return base / 2;
    return base;
  };
  
  const xGridStep = getGridStep(xMax - xMin);
  const yGridStep = getGridStep(yMax - yMin);
  
  // Get selected function
  const selectedFunc = functions.find(f => f.id === selectedFunction);
  
  // Recalculate when variables or functions change
  const selectedIndependentVar = selectedFunc?.independentVar || 'x';
  const selectedY = selectedFunc ? evaluateExpression(selectedFunc.expr, xPoint, selectedIndependentVar, selectedFunc.id) : null;
  const selectedSlope = selectedFunc && selectedY !== null 
    ? (selectedFunc.derivative && selectedFunc.derivative.trim() !== ''
      ? evaluateExpression(selectedFunc.derivative, xPoint, selectedIndependentVar, selectedFunc.id)
      : numericalDerivative(selectedFunc.expr, xPoint, selectedIndependentVar, selectedFunc.id))
    : null;
  
  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      <h1 className="text-3xl font-bold text-center mb-6 text-slate-800">
        Advanced Graphing Calculator with Variables
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Functions and Variables */}
        <div className="lg:col-span-1 space-y-4">
          {/* Variables Panel */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Variables</h2>
            
            {error && (
              <div className="mb-3 p-2 bg-red-100 text-red-700 text-sm rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {variables.map((variable) => (
                <div key={variable.name} className={`p-3 rounded-lg border ${
                  variable.locked 
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300' 
                    : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-lg ${variable.locked ? 'text-amber-700' : 'text-purple-700'}`}>
                        {variable.name}
                      </span>
                      {variable.locked && (
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                          Constant
                        </span>
                      )}
                    </div>
                    {!variable.locked && (
                      <button
                        onClick={() => deleteVariable(variable.name)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-600">Value:</span>
                        <span className={`font-mono font-bold ${variable.locked ? 'text-amber-700' : 'text-purple-700'}`}>
                          {variable.value.toFixed(variable.locked ? 5 : 3)}
                        </span>
                      </div>
                      {!variable.locked && (
                        <input
                          type="range"
                          min={variable.min}
                          max={variable.max}
                          step={variable.step}
                          value={variable.value}
                          onChange={(e) => updateVariable(variable.name, 'value', e.target.value)}
                          className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                        />
                      )}
                      {variable.locked && (
                        <div className="text-xs text-amber-600 italic">π = 3.14159...</div>
                      )}
                    </div>
                    
                    {!variable.locked && (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-gray-600">Min:</label>
                          <input
                            type="number"
                            value={variable.min}
                            onChange={(e) => updateVariable(variable.name, 'min', e.target.value)}
                            className="w-full px-1 py-0.5 border rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-gray-600">Max:</label>
                          <input
                            type="number"
                            value={variable.max}
                            onChange={(e) => updateVariable(variable.name, 'max', e.target.value)}
                            className="w-full px-1 py-0.5 border rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-gray-600">Step:</label>
                          <input
                            type="number"
                            value={variable.step}
                            onChange={(e) => updateVariable(variable.name, 'step', e.target.value)}
                            className="w-full px-1 py-0.5 border rounded text-xs"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addVariable()}
                placeholder="Variable name (e.g., k, m)"
                className="flex-1 px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-purple-300"
              />
              <button
                onClick={addVariable}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm font-semibold"
              >
                + Add
              </button>
            </div>
          </div>
          
          {/* Functions Panel */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Functions</h2>
              <button
                onClick={addFunction}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-semibold"
              >
                + Add
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {functions.map((func) => (
                <div 
                  key={func.id}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedFunction === func.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={func.name}
                      onChange={(e) => updateFunction(func.id, 'name', e.target.value)}
                      className="font-semibold text-sm bg-transparent border-none focus:outline-none flex-1"
                      style={{ color: func.color }}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={func.visible}
                        onChange={(e) => updateFunction(func.id, 'visible', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <button
                        onClick={() => setSelectedFunction(func.id)}
                        className="px-2 py-1 text-xs bg-blue-100 rounded hover:bg-blue-200"
                      >
                        Select
                      </button>
                      {functions.length > 1 && (
                        <button
                          onClick={() => deleteFunction(func.id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-600">Left side (can be expression like g(x) or [f(x)]^2):</label>
                      <input
                        type="text"
                        defaultValue={`${func.dependentVar || 'f'}(${func.independentVar || 'x'})`}
                        onBlur={(e) => {
                          const input = e.target.value.trim();
                          // Try to parse simple function notation like "f(x)" or "g(t)"
                          const simpleMatch = input.match(/^([a-zA-Z_]\w*)\(([a-zA-Z_]\w*)\)$/);
                          if (simpleMatch) {
                            updateFunction(func.id, 'dependentVar', simpleMatch[1]);
                            updateFunction(func.id, 'independentVar', simpleMatch[2]);
                          } else {
                            // For complex expressions like [f(x)]^2, just store as dependentVar
                            // Extract the variable from the expression
                            const varMatch = input.match(/\(([a-zA-Z_]\w*)\)/);
                            if (varMatch) {
                              updateFunction(func.id, 'dependentVar', input.replace(/\([^)]+\)/g, '(*)'));
                              updateFunction(func.id, 'independentVar', varMatch[1]);
                            } else {
                              // Reset to valid value if can't parse
                              e.target.value = `${func.dependentVar || 'f'}(${func.independentVar || 'x'})`;
                            }
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur();
                          }
                        }}
                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-300 font-mono"
                        placeholder="f(x) or [f(x)]^2"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-600">
                        {func.dependentVar && func.dependentVar.includes('*') 
                          ? func.dependentVar.replace('(*)', `(${func.independentVar || 'x'})`)
                          : `${func.dependentVar || 'f'}(${func.independentVar || 'x'})`
                        } =
                      </label>
                      <input
                        type="text"
                        value={func.expr}
                        onChange={(e) => updateFunction(func.id, 'expr', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-300 font-mono"
                        placeholder="e.g., a*sin(b*x) + c"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-600">Derivative (optional):</label>
                      <input
                        type="text"
                        value={func.derivative}
                        onChange={(e) => updateFunction(func.id, 'derivative', e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-300 font-mono"
                        placeholder="Leave blank for numerical"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* View Settings */}
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-bold text-slate-800 mb-3">View Settings</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="font-semibold text-gray-600">x min:</label>
                <input
                  type="number"
                  value={xMin}
                  onChange={(e) => setXMin(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 border rounded"
                  step="0.5"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-600">x max:</label>
                <input
                  type="number"
                  value={xMax}
                  onChange={(e) => setXMax(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 border rounded"
                  step="0.5"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-600">y min:</label>
                <input
                  type="number"
                  value={yMin}
                  onChange={(e) => setYMin(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 border rounded"
                  step="0.5"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-600">y max:</label>
                <input
                  type="number"
                  value={yMax}
                  onChange={(e) => setYMax(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 border rounded"
                  step="0.5"
                />
              </div>
            </div>
            
            <div className="mt-3 flex items-center">
              <input
                type="checkbox"
                id="showTangent"
                checked={showTangent}
                onChange={(e) => setShowTangent(e.target.checked)}
                className="w-4 h-4 mr-2"
              />
              <label htmlFor="showTangent" className="text-sm font-semibold text-gray-700">
                Show Tangent Line
              </label>
            </div>
          </div>
          
          {/* Help */}
          <div className="bg-blue-50 rounded-lg p-4 text-xs">
            <h4 className="font-bold text-blue-900 mb-2">Quick Guide:</h4>
            <ul className="space-y-1 text-blue-800">
              <li>• Use <code className="bg-blue-100 px-1 rounded font-bold">pi</code> for π (3.14159...)</li>
              <li>• Create custom variables with sliders</li>
              <li>• Name functions: <code className="bg-blue-100 px-1 rounded">f, g, h</code>, etc.</li>
              <li>• Reference other functions: <code className="bg-blue-100 px-1 rounded">g(x) = f(x)^2</code></li>
              <li>• Compose functions: <code className="bg-blue-100 px-1 rounded">h(x) = f(g(x))</code></li>
              <li>• Supported: sin, cos, tan, sqrt, exp, ln, ^, etc.</li>
            </ul>
            <p className="mt-2 text-blue-700 font-semibold">Try: f(x)=sin(x), then g(x)=f(x)^2</p>
          </div>
        </div>
        
        {/* Graph Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <svg width={width} height={height} className="bg-white rounded-lg">
              {/* Grid lines */}
              <g className="opacity-20">
                {Array.from({ length: Math.ceil((xMax - xMin) / xGridStep) + 1 }, (_, i) => {
                  const x = xMin + i * xGridStep;
                  return (
                    <line 
                      key={`vgrid-${i}`} 
                      x1={toCanvasX(x)} 
                      y1={0} 
                      x2={toCanvasX(x)} 
                      y2={height} 
                      stroke="#666" 
                      strokeWidth="1" 
                    />
                  );
                })}
                {Array.from({ length: Math.ceil((yMax - yMin) / yGridStep) + 1 }, (_, i) => {
                  const y = yMin + i * yGridStep;
                  return (
                    <line 
                      key={`hgrid-${i}`} 
                      x1={0} 
                      y1={toCanvasY(y)} 
                      x2={width} 
                      y2={toCanvasY(y)} 
                      stroke="#666" 
                      strokeWidth="1" 
                    />
                  );
                })}
              </g>
              
              {/* Axes */}
              {xMin <= 0 && xMax >= 0 && (
                <line 
                  x1={toCanvasX(0)} 
                  y1={padding} 
                  x2={toCanvasX(0)} 
                  y2={height-padding} 
                  stroke="#000" 
                  strokeWidth="2" 
                />
              )}
              {yMin <= 0 && yMax >= 0 && (
                <line 
                  x1={padding} 
                  y1={toCanvasY(0)} 
                  x2={width-padding} 
                  y2={toCanvasY(0)} 
                  stroke="#000" 
                  strokeWidth="2" 
                />
              )}
              
              {/* Function curves */}
              {functions.filter(f => f.visible).map((func) => {
                const points = generatePoints(func.expr, func.independentVar || 'x', func.id);
                const pathData = points.reduce((acc, point, i) => {
                  if (point === 'M') return acc + ' M';
                  return acc + (i === 0 || points[i-1] === 'M' ? 'M' : 'L') + point;
                }, '');
                
                return (
                  <path
                    key={func.id}
                    d={pathData}
                    fill="none"
                    stroke={func.color}
                    strokeWidth={selectedFunction === func.id ? 3 : 2}
                    opacity={selectedFunction === func.id ? 1 : 0.6}
                  />
                );
              })}
              
              {/* Tangent line */}
              {showTangent && selectedFunc && selectedY !== null && (
                <g key={`tangent-${selectedFunc.id}-${selectedFunc.expr}-${JSON.stringify(variables.map(v => v.value))}-${xPoint}`}>
                  {(() => {
                    const tangentPoints = getTangentPoints(selectedFunc);
                    if (tangentPoints.length === 0) return null;
                    const pathData = tangentPoints.reduce((acc, point, i) => {
                      return acc + (i === 0 ? 'M' : 'L') + point;
                    }, '');
                    return (
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeDasharray="8,4"
                        opacity="0.8"
                      />
                    );
                  })()}
                  
                  {/* Point on curve */}
                  <circle 
                    cx={toCanvasX(xPoint)} 
                    cy={toCanvasY(selectedY)} 
                    r="6" 
                    fill={selectedFunc.color}
                    stroke="#fff" 
                    strokeWidth="2" 
                  />
                </g>
              )}
              
              {/* Axis labels */}
              <text x={width-20} y={toCanvasY(0)-10} fontSize="14" fill="#000" fontWeight="bold">x</text>
              {xMin <= 0 && xMax >= 0 && (
                <text x={toCanvasX(0)+10} y={30} fontSize="14" fill="#000" fontWeight="bold">y</text>
              )}
            </svg>
            
            {/* Tangent Control */}
            {showTangent && selectedFunc && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Tangent Point: {selectedIndependentVar} = {xPoint.toFixed(4)}
                </label>
                <input
                  type="range"
                  min={xMin}
                  max={xMax}
                  step={(xMax - xMin) / 1000}
                  value={xPoint}
                  onChange={(e) => setXPoint(parseFloat(e.target.value))}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                />
                
                {selectedY !== null && selectedSlope !== null && (
                  <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                    <div className="bg-white p-2 rounded border">
                      <div className="font-semibold text-gray-600">{selectedIndependentVar}</div>
                      <div className="font-mono">{xPoint.toFixed(4)}</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="font-semibold text-gray-600">f({selectedIndependentVar})</div>
                      <div className="font-mono">{selectedY.toFixed(4)}</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="font-semibold text-gray-600">f'({selectedIndependentVar}) (slope)</div>
                      <div className="font-mono">{selectedSlope.toFixed(4)}</div>
                    </div>
                  </div>
                )}
                
                {selectedY !== null && selectedSlope !== null && (
                  <div className="mt-3 bg-purple-50 p-3 rounded border border-purple-200">
                    <div className="font-semibold text-purple-900 text-sm mb-1">Tangent Line Equation:</div>
                    <div className="text-gray-700 font-mono text-xs">
                      y = {selectedSlope.toFixed(4)}({selectedIndependentVar} - {xPoint.toFixed(4)}) + {selectedY.toFixed(4)}
                    </div>
                    <div className="text-gray-600 text-xs mt-1">
                      Simplified: y = {selectedSlope.toFixed(4)}{selectedIndependentVar} + {(selectedY - selectedSlope * xPoint).toFixed(4)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}