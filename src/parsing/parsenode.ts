interface Base {
  init(): void;
  exportPenalty: number;
  setInputSpan(span: Span): void;
  getInputString(): string;
  getInputSpan(): Span;
  shouldExportAns(): boolean;
  getAnsVariable(): [string] | [];
  addDependency(dep: string): void;
  addDependencies(deps: string[]): void;
  addDummyDependency(dep: string): void;
  addDummyDependencies(deps: string[]): void;
  mergeDependencies(): void;
  mergeDependenciesInScope(): void;
  getDependencies(): void;
  getDummyDependencies(): void;
  getScope(): Scope;
  dependsOn(v: string): boolean;
  getExports(): string[];
  getLegalExports(): string[];
  exportsSymbol(v: string): boolean;
  // exportTo(): unknown;
  getOperator(): string;
  isInequality(): boolean;
  isShadeBetween(): boolean;
  getAllIds(): string[];
  getEvaluationInfo(): EvaluationInfo;
  shouldPromoteToSlider(): boolean;
  getSliderVariables(): string[];
  getCompiledDerivative(): Function;
  asValue(): undefined | string | number | boolean | number[] | unknown;
  boundDomain(): unknown;
}

type EvaluationInfo = false | undefined | { val: unknown }[];

export interface Error {
  // "1 ("
  type: "Error";
  _msg: {
    key: string;
    // There's more
  };
  _sliderVariables: string[];
  isError: true;
  getError(): string;
  blocksExport(): boolean;
  // setDependencies() and allowExport() mutate then return `this`, hence Error
  setDependencies(): Error;
  allowExport(): Error;
}

export interface Span {
  input: string;
  start: number;
  end: number;
}

type Scope = unknown; // TODO

interface Expression extends Base {
  args: unknown[];
  treeSize: number;
  // called within init():
  registerDependencies(): void;
  computeTreeSize(): void;
  copyWithArgs(): Expression;
}

interface UpperConstant extends Expression {
  args: [];
  _constantValue: boolean | number;
  asCompilerValue(): boolean | number;
  scalarExprString(): string;
  isNaN(): boolean;
}

export interface Constant extends UpperConstant {
  // "1.5"
  type: "Constant";
}

export interface MixedNumber extends UpperConstant {
  // "1\\frac{3}{2}"
  type: "MixedNumber";
  is_mixed_number: true;
}

export interface DotAccess extends Expression {
  // "a.w"
  type: "DotAccess";
  args: [ChildExprNode, Identifier];
}

export interface OrderedPairAccess extends Expression {
  // "a.x"
  type: "OrderedPairAccess";
  args: [ChildExprNode, Constant];
  point: ChildExprNode;
  index: Constant;
}

interface UpperFunctionCall extends Expression {
  args: ChildExprNode[];
  // FunctionCall uses the BuiltinTable
  _symbol: string;
}

export interface FunctionCall extends UpperFunctionCall {
  // "f(x)"
  type: "FunctionCall";
}

export interface SeededFunctionCall extends UpperFunctionCall {
  // "\\operatorname{random}(3)"
  type: "SeededFunctionCall";
  args: [ExtendSeed, ...ChildExprNode[]];
  seed: unknown;
}

export interface Seed extends Expression {
  type: "Seed";
  _stringValue: string;
  isString: true;
}

export interface ExtendSeed extends Expression {
  type: "ExtendSeed";
  seed: Expression;
  userSeed: Expression;
  tag: unknown;
  asValue(): string;
}

export interface FunctionExponent extends Expression {
  // "f(x)^2"
  args: [Identifier, ChildExprNode, ChildExprNode];
  type: "FunctionExponent";
}

// FunctionFactorial is for stuff like f(x)! ≡ (f(x))!
export interface FunctionFactorial extends Expression {
  // "f(x)!"
  args: [Identifier, ChildExprNode];
  type: "FunctionFactorial";
}

interface UpperIdentifier extends Expression {
  args: [];
  // includes ans.
  _symbol: string;
  _errorSymbol: string;
}

export interface Identifier extends UpperIdentifier {
  // "a"
  type: "Identifier";
}

export interface Ans extends UpperIdentifier {
  // Not sure how to get Ans
  type: "Ans";
}

export interface Integral extends Expression {
  // "\\int_{0}^{1}tdt"
  type: "Integral";
  // differential, bottom, top, integrant
  args: [Identifier, ChildExprNode, ChildExprNode, ChildExprNode];
  _differential: Identifier;
}

export interface Derivative extends Expression {
  // "\\frac{d}{dx}x";
  type: "Derivative";
  args: [ChildExprNode];
  _symbol: string;
}

export interface Prime extends Expression {
  // "f''(x)"
  type: "Prime";
  args: [ChildExprNode];
  order: number;
}

export interface List extends Expression {
  // "[1,2,3]"
  type: "List";
  args: ChildExprNode[];
  length: number;
  isList: true;
  asCompilerValue(): (boolean | number)[];
  // eachArgs(): void // TODO
  wrap(): unknown;
}

export interface Range extends Expression {
  // "[1...5]"
  type: "Range";
  /*
  For [1...2], args are List[1,] and List[2,]
  For [1,2,3,4...9,10,11], args are List[1,2,3,4] and List[9,10,11]
  */
  args: [List, List];
  beginning: List;
  end: List;
  isHalfEmpty(): boolean;
}

export interface ListAccess extends Expression {
  // "L[1]"
  type: "ListAccess";
  args: [ChildExprNode, ChildExprNode];
  list: ChildExprNode;
  index: ChildExprNode;
}

export interface OrderedPair extends Expression {
  // "(1,2)"
  type: "OrderedPair";
  // (1,2,3) also turns into an OrderedPair, even though it's more of a triplet
  args: ChildExprNode[];
}

interface MovablePoint extends OrderedPair {
  moveStrategy: unknown;
  defaultDragMode: unknown;
  valueType: unknown; // types.Point
  isMovablePoint: true;
}

export interface Piecewise extends Expression {
  // "\\{x<1:3, x<2, 5\\}"
  type: "Piecewise";
  // args[0] ? args[1] : args[2]
  args: [ChildExprNode, ChildExprNode, ChildExprNode];
  // chain(): unknown
  // empty(): unknown
}

interface RGBColor extends Expression {
  // Not sure how to get RGBColor
}

/* Repeated Operators */

interface RepeatedOperator extends Expression {
  _index: Identifier;
  // index, start, end, summand
  args: [Identifier, ChildExprNode, ChildExprNode, ChildExprNode];
  evaluateConstant(b: [number, number]): number;
  update(acc: number, el: number): number;
}

export interface Product extends RepeatedOperator {
  // "\\prod_{i=1}^{9}i"
  type: "Product";
  in_place_operator: "*=";
  starting_value: 1;
}

export interface Sum extends RepeatedOperator {
  // "\\sum_{i=1}^{9}i"
  type: "Sum";
  in_place_operator: "+=";
  starting_value: 0;
}

/* Arithmetic operators (expressionTypes) */
export interface Add extends Expression {
  // "1+2"
  args: [ChildExprNode, ChildExprNode];
  type: "Add";
}
export interface Subtract extends Expression {
  // "1-2"
  args: [ChildExprNode, ChildExprNode];
  type: "Subtract";
}
export interface Multiply extends Expression {
  // "1\\cdot 2"
  args: [ChildExprNode, ChildExprNode];
  type: "Multiply";
}
export interface Divide extends Expression {
  // "\\frac{1}{2}"
  args: [ChildExprNode, ChildExprNode];
  type: "Divide";
}
export interface Exponent extends Expression {
  // "2^3"
  args: [ChildExprNode, ChildExprNode];
  type: "Exponent";
}
export interface Negative extends Expression {
  // "-2"
  args: [ChildExprNode];
  type: "Negative";
}
export interface And extends Expression {
  // "1<2<3"
  args: [Comparator, Comparator];
  type: "And";
}
interface RawExponent extends Exponent {
  // Not sure how to get RawExponent
  // Maybe it's Upper only
}

/* Comparing expressions */

interface BaseComparator extends Expression {
  // .create is called with "<", ">", "<=", ">=", and "="
  create(): BaseComparator;
  asComparator(): BaseComparator;
  _difference(): Subtract;
}

export interface Comparator extends BaseComparator {
  // "1<3"
  // "1<=3"
  // "1>3"
  // "1>=3"
  // "\\left\\{x=0\\right\\}",
  type:
    | "Comparator['<']"
    | "Comparator['>']"
    | "Comparator['<=']"
    | "Comparator['>=']"
    | "Comparator['=']";
}

interface DoubleInequality extends Base {
  // Not sure how to get DoubleInequality
  type: "DoubleInequality";
  _operators: [Expression, Expression];
  _expressions: [Expression, Expression];
  _indicator: unknown;
  isShadeBetween(): true;
}

interface SolvedEquation extends Base {
  // Not sure how to get SolvedEquation (probably a later transform)
  type: "SolvedEquation";
  _symbol: string;
  _expression: Expression;
  branchMultiplier: unknown;
}

interface UpperEquation extends Base {
  _lhs: ChildExprNode;
  _rhs: ChildExprNode;
  _difference: Subtract;
  asComparator: Comparator;
}

export interface Equation extends UpperEquation {
  // "1=3"
  type: "Equation";
}

interface UpperAssignment extends UpperEquation {
  _expression: ChildExprNode;
  _symbol: string;
  _exports: [] | [string];
  shouldExportAns(): true;
  computeExports(): [] | [string];
  isEquation(): boolean;
  asEquation(): Equation;
  shouldPromoteToSlider(): boolean;
}

export interface Assignment extends UpperAssignment {
  // "a=3"
  type: "Assignment";
}

export interface Slider extends UpperAssignment {
  type: "Slider";
  sliderAssignment: Expression;
  sliderMin: ChildExprNode;
  sliderMax: ChildExprNode;
  sliderSoftMin: ChildExprNode;
  sliderSoftMax: ChildExprNode;
  sliderStep: ChildExprNode;
  sliderIsPlayingOnce: boolean;
  shouldPromoteToSlider(): false;
  asAssignment(): Assignment;
}

export interface FunctionDefinition extends UpperEquation {
  // "f(x)=x^2"
  type: "FunctionDefinition";
  // _exports are _symbol but wrapped
  _exports: [string];
  _symbol: string;
  _argSymbols: string[];
  _expression: ChildExprNode;
  asEquation(): Equation;
}

/* Full-expr funcs */

interface FullExprFunc extends Expression {
  args: ChildExprNode[];
}

export interface Stats extends FullExprFunc {
  // "\\operatorname{stats}(L)"
  type: "Stats";
  _symbol: "stats";
}
export interface Boxplot extends FullExprFunc {
  // "\\operatorname{boxplot}(L)"
  type: "Boxplot";
  _symbol: "boxplot";
}
export interface Dotplot extends FullExprFunc {
  // "\\operatorname{dotplot}(L)"
  type: "Dotplot";
  _symbol: "dotplot";
}
export interface Histogram extends FullExprFunc {
  // "\\operatorname{histogram}(L)"
  type: "Histogram";
  _symbol: "histogram";
}
export interface IndependentTTest extends FullExprFunc {
  // "\\operatorname{ittest}(L,M)"
  type: "IndependentTTest";
  _symbol: "ittest";
}
export interface TTest extends FullExprFunc {
  // "\\operatorname{ttest}(L)"
  type: "TTest";
  _symbol: "ttest";
}
export interface Polygon extends FullExprFunc {
  // "\\operatorname{polygon}(P)"
  type: "Polygon";
  _symbol: "polygon";
}

/* Image */

export interface Image extends Base {
  type: "Image";
  isImage: true;
  center: ChildExprNode;
  radianAngle: ChildExprNode;
  width: ChildExprNode;
  height: ChildExprNode;
  opacity: ChildExprNode;
  moveStrategy: unknown;
}

/* Regression */

export interface Regression extends Base {
  type: "Regression";
  _lhs: ChildExprNode;
  isLhsSimple: boolean; // just an identifier
  _logLhs: FunctionCall;
  _rhs: ChildExprNode;
  _difference: Subtract;
  _logDifference: Subtract;
  isRegression: true;
  exportTo: unknown;
  getSliderVariables(): [];
}

export interface OptimizedRegression extends Base {
  type: "OptimizedRegression";
  parameters: unknown;
  residuals: unknown;
  statistics: unknown;
  model: unknown;
  isModelValid: boolean;
  residualVariable: string;
  residualSuggestionId: unknown;
  shouldSuggestLogMode: boolean;
  isLinear: boolean;
  parameterWarning: unknown;
  _exports: [string];
  getCompiledFunction(): Function;
  getCompiledDerivative(): Function;
}

/* Simulation */
export interface Simulation extends Base {
  type: "Simulation";
  isSimulation: true;
  fps: ChildExprNode;
}

/* Intermediate Representation */
export interface IRExpression extends Base {
  type: "IRExpression";
  _chunk: unknown;
  valueType: unknown;
  isList: boolean;
  // length is for isList only
  length: number;
  isConstant: boolean;
  shouldExportAns(): true;
  getCompiledFunction(): Function;
  polynomialOrder(): number;
  getPolynomialCoefficients(): number[];
  takeDerivative(): IRExpression;
  boundDomain(): unknown;
  asValue(): unknown;
  asCompilerValue(): boolean | number | boolean[] | number[];
  isNaN(): boolean;
  getEvaluationInfo(): EvaluationInfo;
  elementAt(): unknown;
  findLinearSubset(): unknown;
  deriveRegressionRestrictions(): unknown;
  eachElement(f: unknown): void;
  mapElements(f: unknown): unknown[];
}

/* Table */

export interface TableColumn extends Base {
  type: "TableColumn";
  header: ChildExprNode;
  length: unknown;
  values: unknown;
  isIndependent: boolean;
  _exports: string[];
  isDiscrete(): boolean;
  _exportSymbolsTo: unknown;
  exportTo: unknown;
  exportToLocal: unknown;
}

export interface Table extends Base {
  type: "Table";
  columns: TableColumn[];
  _exports: string[];
  exportPenalty: 1;
  isTable: true;
  // exportTo
  getAllIds(): string[];
}

export type RootOnlyExprNode =
  | Equation
  | Assignment
  | FunctionDefinition
  | Stats
  | Boxplot
  | Dotplot
  | Histogram
  | IndependentTTest
  | TTest
  | Polygon
  | Regression;

export type ChildExprNode =
  | Error
  | Constant
  | MixedNumber
  | DotAccess
  | FunctionCall
  | FunctionExponent
  | FunctionFactorial
  | Identifier // This includes ans
  | Integral
  | Derivative
  | Prime
  | List
  | Range
  | ListAccess
  | OrderedPair
  | OrderedPairAccess
  | Piecewise
  | Product
  | Sum
  | SeededFunctionCall
  | Add
  | Subtract
  | Multiply
  | Divide
  | Exponent
  | Negative
  | And
  | Comparator
  | Assignment
  // Seed + ExtendSeed only used in SeededFunctionCalls?
  | Seed
  | ExtendSeed;

// These can only occur after further transformation or something
type IrrelevantExprNode =
  | Ans
  | MovablePoint
  | RGBColor
  | RepeatedOperator
  | RawExponent
  | BaseComparator
  | DoubleInequality
  | SolvedEquation
  | Slider
  | Image
  | OptimizedRegression
  | Simulation
  | IRExpression
  | TableColumn
  | Table;

type Node = RootOnlyExprNode | ChildExprNode;
export default Node;