import "./index.less";
import sandboxHTML from "./sandbox.html";
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { ClassComponent, jsx } from "DCGView";
import { FolderModel } from "globals/models";
import { Calc } from "globals/window";
import { PluginController } from "plugins/PluginController";
import * as ts from "typescript";

export default class ComputedExpressions extends PluginController {
  static id = "computed-expressions" as const;
  static enabledByDefault = true;

  iframe!: HTMLIFrameElement;

  afterEnable(): void {
    this.iframe = document.createElement("iframe");
    this.iframe.setAttribute("sandbox", "allow-scripts");
    this.iframe.setAttribute("origin", window.location.origin);
    this.iframe.srcdoc = sandboxHTML;
    window.addEventListener("message", (msg) => {
      const state = Calc.getState();
      if (msg.data.type === "expression") {
        const idx = state.expressions.list.findIndex(
          (e) => e.id === msg.data.id
        );
        if (idx === -1) return;
        state.expressions.list.splice(idx + 1, 0, {
          ...msg.data.expr,
          folderId: msg.data.id,
        });
      } else if (msg.data.type === "clear") {
        state.expressions.list = state.expressions.list.filter(
          (e) => e.type === "folder" || e.folderId !== msg.data.id
        );
      }
      Calc.setState(state);
    });
    document.body.appendChild(this.iframe);
  }

  afterDisable(): void {}

  createFolderView(oldview: { props: { onInput: (input: string) => void } }) {
    let view: EditorView | undefined;
    const model = () => oldview.props.model() as FolderModel;
    const self = this;
    const container = (
      <div class="dsm-computed-expressions-container">
        <button
          onClick={(e: MouseEvent) => {
            if (!view) return;

            let tgt = e.target as HTMLElement | null;
            while (tgt && !tgt.classList.contains("dcg-expressionfolder")) {
              tgt = tgt.parentElement;
            }

            if (tgt) {
              tgt.focus();
              setTimeout(() => {
                const txt = view?.state.doc.toString() ?? "";

                console.log(
                  "JS:",
                  txt,
                  "\n\nTS:",
                  ts.transpileModule(txt, {}).outputText
                );

                // eslint-disable-next-line no-eval
                self.iframe?.contentWindow?.postMessage(
                  {
                    code: txt,
                    id: Calc.controller.getSelectedItem()?.id ?? 0,
                  },
                  "*"
                );
              });
            }
          }}
        >
          Run
        </button>
        <div
          onMount={(e: HTMLDivElement) => {
            view = new EditorView({
              state: EditorState.create({
                doc: model().title,
                extensions: [
                  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                  keymap.of(defaultKeymap),
                  javascript(),
                  EditorView.updateListener.of((view) => {
                    oldview.props.onInput(view.state.doc.toString());
                  }),
                ],
              }),
              parent: e,
            });
          }}
        ></div>
      </div>
    );
    return container;
  }
}
