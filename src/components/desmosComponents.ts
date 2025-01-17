import { ExpressionModel, ItemModel } from "../globals/models";
import { ClassComponent, Component, DCGView } from "DCGView";
import { DesModderFragile, Calc, Fragile } from "globals/window";

export abstract class CheckboxComponent extends ClassComponent<{
  checked: boolean;
  disabled?: boolean;
  small?: boolean;
  ariaLabel: string;
  onChange: (checked: boolean) => void;
}> {}

export const Checkbox = Fragile.Checkbox;

export abstract class SegmentedControlComponent extends ClassComponent<{
  ariaGroupLabel: string;
  minButtonWidth?: number;
  disabled?: boolean;
  theme?: "mini" | "default";
  staticConfig: {
    key: string;
    label: () => string;
    ariaLabel?: () => string;
    selected: () => boolean;
    onSelect: () => void;
    icon?: () => string;
    tooltip?: () => unknown;
    tooltipGravity?: () => unknown;
    class?: () => string;
    focusHelperOptions?: unknown;
  }[];
}> {}

export const DesmosSegmentedControl = Fragile.SegmentedControl;

export interface MathQuillField {
  keystroke: (key: string, e?: KeyboardEvent) => void;
  latex: (input?: string) => string;
  typedText: (input: string) => void;
  focus: () => void;
  blur: () => void;
}

export abstract class MathQuillViewComponent extends ClassComponent<{
  latex: string;
  capExpressionSize: number | false;
  config: { autoOperatorNames: string };
  isFocused: boolean;
  getAriaLabel: string;
  getAriaPostLabel: string;
  onUserChangedLatex: (s: string) => void;
  onUserPressedKey?: (key: string, e: KeyboardEvent) => void;
  hasError?: boolean;
  selectOnFocus?: boolean;
  needsSystemKeypad?: boolean;
  onFocusedChanged?: (isFocused: boolean) => void;
  noFadeout?: boolean;
}> {}

export const MathQuillView = Fragile.MathquillView;

export abstract class InlineMathInputViewComponent extends ClassComponent<{
  latex: string;
  // capExpressionSize: number | false;
  // config: { autoOperatorNames: string };
  isFocused: boolean;
  ariaLabel: string;
  // ariaPostLabel: string;
  placeholder?: string;
  handleLatexChanged: (s: string) => void;
  handlePressedKey?: (key: string, e: KeyboardEvent) => void;
  hasError?: boolean;
  selectOnFocus?: boolean;
  needsSystemKeypad?: boolean;
  handleFocusChanged?: (isFocused: boolean) => void;
  noFadeout?: boolean;
  readonly: boolean;
  controller: typeof Calc.controller;
}> {}

/** General InlineMathInputView, without any defaults filled in */
export const InlineMathInputViewGeneral = Fragile.InlineMathInputView;

export const {
  If,
  For,
  IfDefined,
  IfElse,
  Input,
  Switch,
  SwitchUnion,
  Textarea,
} = DCGView.Components;

export abstract class DStaticMathquillViewComponent extends ClassComponent<{
  latex: string;
  config: any;
}> {}

export const DStaticMathquillView = Fragile.StaticMathquillView;

export abstract class TooltipComponent extends ClassComponent<{
  tooltip: string;
  gravity?: "n" | "e" | "s" | "w";
}> {}

export const Tooltip = Fragile.Tooltip;

export abstract class ExpressionViewComponent extends ClassComponent<
  ModelAndController & {
    onDragPending: () => void;
    isDragCopy: () => boolean;
  }
> {}

const ExpressionView = DesModderFragile.ExpressionView;

export abstract class IconViewComponent extends ClassComponent<{
  model: ItemModel;
  controller: typeof Calc.controller;
}> {}

export const ImageIconView = DesModderFragile.ImageIconView;

interface ModelAndController {
  model: ExpressionModel;
  controller: typeof Calc.controller;
}

// <ExpressionIconView ... >
export class ExpressionIconView extends Component<ModelAndController> {
  template() {
    const template = exprTemplate(this);
    return template.children[1].children[1].children[0];
  }
}

// <If predicate={this.shouldShowFooter}>
//   {() => <div class={this.getFooterClass()}> ...
export class FooterView extends Component<ModelAndController> {
  template() {
    const template = exprTemplate(this);
    return template.children[0].children[2];
  }
}

function exprTemplate(
  self: InstanceType<typeof Component<ModelAndController>>
) {
  const n = new (ExpressionView as any)(
    {
      model: () => self.props.model(),
      controller: () => self.props.controller(),
      onDragPending: () => {},
      isDragCopy: () => false,
    },
    []
  );
  return n.template();
}
