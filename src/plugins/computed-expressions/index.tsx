import "./index.less";
import sandboxHTML from "./sandbox.html";
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { Diagnostic, linter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { ClassComponent, jsx } from "DCGView";
import { FolderModel } from "globals/models";
import { Calc } from "globals/window";
import { PluginController } from "plugins/PluginController";
import * as ts from "typescript";

function getTypescriptCompilerHost(view: EditorView): ts.CompilerHost {
  return {
    getSourceFile: (fileName, languageVersion, onError) => {
      return ts.createSourceFile(
        "index.ts",
        view.state.doc.toString(),
        languageVersion
      );
    },
    getDefaultLibFileName: (opts) => "index.ts",
    writeFile: () => {},
    getCurrentDirectory: () => "/",
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => false,
    getNewLine: () => "\n",
    fileExists: () => true,
    readFile: (filename: string) => {
      if (filename === "index.ts") {
        return view.state.doc.toString();
      } else {
        return JSON.stringify(Calc.controller.getItemModel(filename));
      }
    },
  };
}

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

  createFolderView(oldview: {
    props: { onInput: (input: string) => void; model: () => FolderModel };
  }) {
    let view: EditorView | undefined;
    const model = () => oldview.props.model();
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
                if (!view) return;

                const host: ts.CompilerHost = getTypescriptCompilerHost(view);

                const prog = ts.createProgram({
                  rootNames: ["index.ts"],
                  options: {
                    strict: true,
                  },
                  host,
                });

                console.log(prog, prog.emit());

                const code = prog.emit().emittedFiles?.[0] ?? "";

                // eslint-disable-next-line no-eval
                self.iframe?.contentWindow?.postMessage(
                  {
                    code,
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
                  javascript({ typescript: true }),
                  EditorView.updateListener.of((view) => {
                    oldview.props.onInput(view.state.doc.toString());
                  }),
                  linter((view) => {
                    const host: ts.CompilerHost =
                      getTypescriptCompilerHost(view);

                    const prog = ts.createProgram({
                      rootNames: ["index.ts"],
                      options: {
                        strict: true,
                      },
                      host,
                    });

                    // const output = prog.emit();

                    return (
                      ts.getPreEmitDiagnostics(prog)?.map((e) => {
                        return {
                          severity: "error",
                          message: JSON.stringify(e.messageText),
                          from: e.start ?? 0,
                          to: (e.start ?? 0) + (e.length ?? 0),
                        } satisfies Diagnostic;
                      }) ?? []
                    );
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
