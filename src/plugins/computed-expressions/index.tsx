import GraphStateSource from "../../../node_modules/@desmodder/graph-state/state.ts?raw";
import APIDTS from "./api.d.ts?raw";
import { embeddedMQPlugin } from "./embedded-mq-plugin";
import "./index.less";
import quoteStripper from "./quote-stripper.grammar";
import sandboxHTML from "./sandbox.html";
import { defaultKeymap } from "@codemirror/commands";
import {
  LRLanguage,
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { Diagnostic, linter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { parseMixed } from "@lezer/common";
import { parser as jsParser } from "@lezer/javascript";
import { jsx } from "#DCGView";
import { FolderModel, Calc } from "#globals";
import { PluginController } from "#plugins/PluginController.ts";
import { textModeParser } from "#plugins/text-mode/lezer/index.ts";
import { buildConfig } from "text-mode-core";
import { Project } from "ts-morph";
import * as ts from "typescript";

function addAllFoldersToTSProject(project: Project) {
  for (const item of Calc.controller.getAllItemModels()) {
    if (item.type === "folder") {
      const folderSrc = project.createSourceFile(
        `${item.id}.ts`,
        item.title ?? ""
      );
    }
  }
}

export default class ComputedExpressions extends PluginController {
  static id = "computed-expressions" as const;
  static enabledByDefault = true;

  iframe!: HTMLIFrameElement;

  afterEnable(): void {
    this.iframe = document.createElement("iframe");
    this.iframe.setAttribute("sandbox", "allow-scripts");
    this.iframe.setAttribute("origin", window.location.origin);
    this.iframe.srcdoc = sandboxHTML.replace(
      "SRC_HERE",
      window.computedExpressionsSandboxURL
    );
    window.addEventListener("message", (msg) => {
      if (msg.source !== this.iframe.contentWindow) return;
      const state = Calc.getState();
      if (msg.data.type === "expression") {
        const idx = state.expressions.list.findIndex(
          (e) => e.id === msg.data.id
        );
        if (idx === -1) return;
        state.expressions.list.splice(idx + 1, 0, {
          type: "expression",
          ...msg.data.expr,
          folderId: msg.data.id,
          id: Calc.controller.generateId(),
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
              void (async () => {
                if (!view) return;

                const project = new Project({
                  compilerOptions: {
                    strict: true,
                    target: ts.ScriptTarget.ES5,
                  },
                  skipAddingFilesFromTsConfig: true,
                  useInMemoryFileSystem: true,
                });

                const src = project.createSourceFile(
                  "index.ts",
                  view.state.doc.toString()
                );

                const code = src.getEmitOutput().getOutputFiles()[0].getText();

                // eslint-disable-next-line no-eval
                self.iframe?.contentWindow?.postMessage(
                  {
                    code,
                    tmConfig: (() => {
                      const cfg = buildConfig({});
                      return { ...cfg, parseDesmosLatex: undefined };
                    })(),
                    id: Calc.controller.getSelectedItem()?.id ?? 0,
                  },
                  "*"
                );
              })();
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
                  LRLanguage.define({
                    parser: jsParser.configure({
                      dialect: "ts",
                      wrap: parseMixed((node) => {
                        const parent = node.node.parent;

                        if (!parent) return null;

                        const nodeContent = view?.state.doc.sliceString(
                          parent.from,
                          parent.to
                        );

                        if (
                          node.name === "TemplateString" &&
                          parent.name === "TaggedTemplateExpression" &&
                          nodeContent?.startsWith("tm.")
                        ) {
                          return {
                            parser: quoteStripper.configure({
                              wrap: parseMixed((node) => {
                                const nodeContent = view?.state.doc.sliceString(
                                  node.from,
                                  node.to
                                );

                                if (node.name === "Body") {
                                  const nodeContent =
                                    view?.state.doc.sliceString(
                                      node.from,
                                      node.to
                                    );

                                  return {
                                    parser: textModeParser(),
                                  };
                                }
                                return null;
                              }),
                            }),
                          };
                        }
                        return null;
                      }),
                    }),
                  }),
                  EditorView.updateListener.of((view) => {
                    oldview.props.onInput(view.state.doc.toString());
                  }),
                  embeddedMQPlugin,
                  linter((view) => {
                    // const host: ts.CompilerHost =
                    //   getTypescriptCompilerHost(view);

                    // const prog = ts.createProgram({
                    //   rootNames: ["index.ts"],
                    //   options: {
                    //     strict: true,
                    //   },
                    //   host,
                    // });

                    const project = new Project({
                      compilerOptions: {
                        strict: true,
                        target: ts.ScriptTarget.ES5,
                      },
                      skipAddingFilesFromTsConfig: true,
                      useInMemoryFileSystem: true,
                    });

                    project.createSourceFile(
                      "index.ts",
                      view.state.doc.toString()
                    );

                    const graphstate = project.createSourceFile(
                      "graphstate.d.ts",
                      GraphStateSource.replace(/\nexport/g, "\ndeclare")
                    );

                    const api = project.createSourceFile("api.d.ts", APIDTS);

                    // const output = prog.emit();

                    return (
                      project.getPreEmitDiagnostics()?.map((e) => {
                        return {
                          severity: "error",
                          message: JSON.stringify(e.getMessageText()),
                          from: e.getStart() ?? 0,
                          to: (e.getStart() ?? 0) + (e.getLength() ?? 0),
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
