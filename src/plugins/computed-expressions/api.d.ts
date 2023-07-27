type MakeOptional<T extends object, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
declare type MinimalExpressionState = MakeOptional<
  ExpressionState,
  "id" | "color" | "type"
>;
declare type NonExpressionItemState = Exclude<ItemState, ExpressionState>;
declare type MinimalItemState =
  | MinimalExpressionState
  | MakeOptional<NonExpressionItemState, "id">;
declare function expression(expr: MinimalItemState): void;
declare function clear(): void;
declare function mq(str: string): string;
declare interface TextModeFunctions {
  math: (template: TemplateStringsArray) => string;
  expr: (template: TemplateStringsArray) => ItemState;
}
declare const tm: TextModeFunctions;
