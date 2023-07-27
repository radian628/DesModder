import { syntaxTree } from "@codemirror/language";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { DCGView } from "DCGView";
import { InlineMathInputView, MathQuillField } from "components";

function escapeString(str: string) {
  return JSON.stringify(str).slice(1, -1);
}

function unescapeString(str: string) {
  return JSON.parse(`"${str}"`) as string;
}

class EmbeddedMQWidget extends WidgetType {
  mutValue: string;
  constructor(readonly value: string) {
    super();
    this.mutValue = value;
  }

  //   eq(other: EmbeddedMQWidget) {
  //     return true;
  //   }

  getMathField() {
    const mathfieldElem = this.span.querySelector(
      ".dcg-math-field"
    ) as HTMLElement;
    // @ts-expect-error
    const mathfield = mathfieldElem?._mqMathFieldInstance as MathQuillField;
    return mathfield;
  }

  updateDOM(dom: HTMLElement, view: EditorView): boolean {
    const mathfieldElem = dom.querySelector(".dcg-math-field") as HTMLElement;
    if (mathfieldElem?.style) mathfieldElem.style.maxWidth = "unset";
    // @ts-expect-error
    const mathfield = mathfieldElem?._mqMathFieldInstance as MathQuillField;
    if (mathfield.latex() !== unescapeString(this.mutValue)) {
      // mathfield.latex(unescapeString(this.mutValue));
      return false;
    }
    return true;
  }

  span!: HTMLSpanElement;

  toDOM(view: EditorView) {
    console.log(this.mutValue);
    const div = document.createElement("span");
    const mq = DCGView.mountToNode(InlineMathInputView, div, {
      latex: () => unescapeString(this.mutValue),
      hasError: () => false,
      isFocused: () => false,
      ariaLabel: () => "code-editor-mq",
      handleLatexChanged: (ltx: string) => {
        console.log("mutvalue", ltx);
        const newValue = escapeString(ltx);
        const pos = view.posAtDOM(div);
        const from = pos;
        const to = pos + this.mutValue.length + 2;
        view.dispatch(
          view.state.update({
            changes: {
              from,
              to,
              insert: `"${newValue}"`,
            },
          })
        );
        this.mutValue = newValue;
      },
      handleFocusChanged: () => {},
    });
    this.span = div;
    const mathfieldElem = this.span.querySelector(
      ".dcg-math-field"
    ) as HTMLElement;
    if (mathfieldElem?.style) mathfieldElem.style.maxWidth = "unset";

    const mathfield = this.getMathField();
    console.log(mathfield);

    mathfield.config({
      handlers: {
        moveOutOf: (dir) => {
          const pos =
            view.posAtDOM(div) + (dir === 1 ? this.mutValue.length + 3 : 0);

          console.log(pos);
          view.focus();
          view.dispatch({
            selection: {
              anchor: pos,
              head: pos,
            },
          });
          // console.log("moveoutof", dir);
        },
      },
    });

    return div;
  }
}

function regenerateEmbeddedMQ(view: EditorView): DecorationSet {
  const mqs: ReturnType<Decoration["range"]>[] = [];
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const rangeString = view.state.doc.sliceString(node.from, node.to);
        const arglist = node.node.getChildren("ArgList")?.[0];
        const stringLiteral = arglist?.getChildren("String")?.[0];

        if (
          node.name === "CallExpression" &&
          rangeString.startsWith("mq") &&
          arglist &&
          stringLiteral &&
          view.state.doc.sliceString(node.to - 1, node.to) === ")"
        ) {
          const lit = view.state.doc
            .sliceString(stringLiteral.from, stringLiteral.to)
            .slice(1, -1);

          try {
            unescapeString(lit);
          } catch {
            return;
          }

          const deco = Decoration.widget({
            widget: new EmbeddedMQWidget(lit),
            side: 4,
            block: false,
          });
          mqs.push(deco.range(stringLiteral.from));
          mqs.push(
            Decoration.mark({ class: "cm-embedded-mq" }).range(
              stringLiteral.from,
              stringLiteral.to
            )
          );
        }
      },
    });
  }
  return Decoration.set(mqs);
}

export const embeddedMQPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = regenerateEmbeddedMQ(view);
    }

    update(update: ViewUpdate) {
      const cursorpos = update.view.state.selection.main.from;
      const dom = update.view.domAtPos(cursorpos).node.parentElement;
      const domnext = update.view.domAtPos(cursorpos + 1).node.parentElement;

      console.log("got here", dom);
      if (dom instanceof HTMLElement && dom === domnext) {
        const embeddedMQ = dom.closest(".cm-embedded-mq");
        const mathfield = embeddedMQ?.previousElementSibling?.querySelector(
          ".dcg-math-field"
        )?._mqMathFieldInstance as MathQuillField;
        if (mathfield) {
          mathfield.focus();
        }
      }

      if (update.docChanged || update.viewportChanged) {
        this.decorations = regenerateEmbeddedMQ(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
