import { Component, jsx, mountToNode } from "#DCGView";
import { GraphState } from "@desmodder/graph-state";
import { Inserter, PluginController } from "../PluginController";
import "./index.less";
import { format } from "localization/i18n-core";
import { For, IfElse, InlineMathInputView } from "src/components";
import { Calc, ExpressionModel, FolderModel } from "src/globals";

function calcGraphStateCost(state: GraphState) {
  return state.expressions.list.reduce(
    (prev, curr) => {
      if (curr.type !== "expression" || !curr.latex) return prev;

      const golfStats = getGolfStats(curr.latex);

      return {
        width: prev.width + golfStats.width,
        symbols: prev.symbols + golfStats.symbols,
      };
    },
    { width: 0, symbols: 0 }
  );
}

function calcWidthInPixels(domNode?: HTMLElement) {
  const rootblock = domNode?.querySelector(".dcg-mq-root-block");

  if (!rootblock?.lastChild || !rootblock.firstChild) return 0;

  const range = document.createRange();
  range.setStartBefore(rootblock.firstChild);
  range.setEndAfter(rootblock.lastChild);

  const width = range.getBoundingClientRect().width;

  return width;
}

function symbolCount(el: Element) {
  const svgLen = [".dcg-mq-fraction", "svg", ".dcg-mq-token"]
    .map((s) => el.querySelectorAll(s).length)
    .reduce((a, b) => a + b);
  return (
    svgLen +
    (el.textContent?.replace(
      /\s|[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g,
      ""
    )?.length ?? 0)
  );
}

function calcSymbolCount(el?: HTMLElement) {
  const rootblock = el?.querySelector(".dcg-mq-root-block");
  if (!rootblock) return 0;

  return rootblock ? symbolCount(rootblock) : 0;
}

const cachedGolfStatsPool = new Map<string, ReturnType<typeof getGolfStats>>();

function getGolfStats(latex: string): {
  width: number;
  symbols: number;
} {
  const cached = cachedGolfStatsPool.get(latex);
  if (cached) return cached;

  const fakeContainer = document.createElement("div");
  document.body.appendChild(fakeContainer);
  fakeContainer.style.transform = `scale(${1 / 0.75})`;

  mountToNode(InlineMathInputView, fakeContainer, {
    latex: () => latex ?? "",
    isFocused: () => false,
    selectOnFocus: () => false,
    handleLatexChanged: () => {},
    hasError: () => false,
    handleFocusChanged: () => () => false,
    ariaLabel: () => "",
    // getAriaLabel: () => "",
    // getAriaPostLabel: () => "",
    // capExpressionSize: () => false as false,
    // onUserChangedLatex: () => {},
    // config: () => ({ autoOperatorNames: "" }),
  });

  const stats = {
    width: calcWidthInPixels(fakeContainer),
    symbols: calcSymbolCount(fakeContainer),
  };

  cachedGolfStatsPool.set(latex, stats);

  if (cachedGolfStatsPool.size > 10000) {
    cachedGolfStatsPool.delete(cachedGolfStatsPool.keys().next().value);
  }

  document.body.removeChild(fakeContainer);

  return stats;
}

export class ExpressionItemCostPanel extends Component<{
  model: () => ExpressionModel;
  el: () => HTMLDivElement;
}> {
  rootblock: Element | null | undefined = null;

  template() {
    const chars = () => this.props.model().latex?.length ?? 0;

    return IfElse(() => chars() > 0, {
      true: () => (
        <div class="dsm-code-golf-char-count-container">
          <div class="dsm-code-golf-char-count">
            <div>
              {() => {
                return format("code-golf-width-in-pixels", {
                  pixels: Math.round(
                    getGolfStats(this.props.model().latex ?? "").width
                  ).toString(),
                });
              }}
            </div>
            <div>
              {() => {
                return format("code-golf-symbol-count", {
                  elements: getGolfStats(this.props.model().latex ?? "")
                    .symbols,
                });
              }}
            </div>
          </div>
        </div>
      ),
      false: () => <div></div>,
    });
  }
}
export class FolderCostPanel extends Component<{
  model: () => FolderModel;
}> {
  totalWidth = 0;
  totalSymbols = 0;

  enabled = true;
  checkedStats = false;

  recalculate() {
    const exprs = Calc.controller
      .getAllItemModels()
      .filter(
        (m) => m.type === "expression" && m.folderId === this.props.model().id
      ) as ExpressionModel[];

    this.totalWidth = 0;
    this.totalSymbols = 0;

    if (!this.checkedStats) {
      const chars = exprs.reduce(
        (prev, curr) => prev + (curr.latex?.length ?? 0),
        0
      );

      if (chars > 2000) {
        this.enabled = false;
        this.checkedStats = true;
        this.update();
        return;
      }
    }

    for (const e of exprs) {
      const { width, symbols } = getGolfStats(e.latex ?? "");
      this.totalWidth += width;
      this.totalSymbols += symbols;
    }

    this.update();
  }

  dispatcher!: string;

  willUnmount() {
    Calc.controller.dispatcher.unregister(this.dispatcher);
  }

  template() {
    setTimeout(() => {
      this.recalculate();
    }, 0);

    this.dispatcher = Calc.controller.dispatcher.register(() => {
      this.recalculate();
    });

    return (
      <div
        class="dsm-code-golf-char-count-container"
        onClick={() => {
          this.enabled = true;
          this.recalculate();
        }}
      >
        {IfElse(() => this.enabled, {
          true: () => (
            <div class="dsm-code-golf-char-count">
              <div>
                {() =>
                  format("code-golf-width-in-pixels", {
                    pixels: Math.round(this.totalWidth),
                  })
                }
              </div>
              <div>
                {() =>
                  format("code-golf-symbol-count", {
                    elements: this.totalSymbols,
                  })
                }
              </div>
            </div>
          ),
          false: () => (
            <div class="dsm-code-golf-char-count dsm-clickable">
              {format("code-golf-click-to-enable-folder")}
            </div>
          ),
        })}
      </div>
    );
  }
}

async function getGraphFromHash(hash: string): Promise<{
  parent_hash?: string;
  state: GraphState;
}> {
  return await (
    await fetch(`https://www.desmos.com/calculator/${hash}`, {
      headers: {
        Accept: "application/json",
      },
    })
  ).json();
}

async function getEntireGraphHistory(
  hash: string,
  state: GraphState
): Promise<
  {
    hash: string;
    state: GraphState;
  }[]
> {
  const cachedGraphHistory = localStorage.getItem(`dsm-graph-history-${hash}`);

  if (cachedGraphHistory)
    return await Promise.all(
      (JSON.parse(cachedGraphHistory) as string[]).map(async (hash) => {
        return {
          hash,
          state: (await getGraphFromHash(hash)).state,
        };
      })
    );

  let parentHash: string | undefined = hash;

  const graphs = [
    {
      hash,
      state,
    },
  ];

  while (parentHash) {
    const parentGraph = await getGraphFromHash(parentHash);
    graphs.push({
      hash: parentHash,
      state: parentGraph.state,
    });
    parentHash = parentGraph.parent_hash;
  }

  localStorage.setItem(
    `dsm-graph-history-${hash}`,
    JSON.stringify(graphs.map((g) => g.hash))
  );

  return graphs;
}

export class Menu extends Component {
  historyCosts: {
    hash: string;
    symbols: number;
    width: number;
  }[] = [];

  inProgress = false;

  template() {
    console.log("histroycosts", this.historyCosts);

    return (
      <div class="dcg-popover-interior">
        <button
          onClick={async () => {
            this.inProgress = true;
            this.update();
            const history = await getEntireGraphHistory(
              window.location.pathname.split("/").at(-1) as string,
              Calc.getState()
            );
            this.inProgress = false;
            this.update();

            this.historyCosts = history
              .map((h) => {
                return {
                  hash: h.hash,
                  ...calcGraphStateCost(h.state),
                };
              })
              .sort((a, b) => a.symbols - b.symbols)
              .slice(0, 5);

            this.update();
          }}
        >
          Compare with Graph History
        </button>
        {IfElse(() => this.inProgress, {
          true: () => (
            <div>
              Fetching history... (this may take a while the first time)
            </div>
          ),
          false: () => <div></div>,
        })}
        <For each={() => this.historyCosts ?? []} key={(e) => e.hash}>
          <ul class="dsm-code-golf-best-history-list">
            {(e: Menu["historyCosts"][number]) => (
              // TODO: localization support
              <li>
                <div>
                  Hash:{" "}
                  <a
                    target="_blank"
                    href={() => `https://www.desmos.com/calculator/${e.hash}`}
                  >
                    {() => e.hash}
                  </a>
                </div>
                <div>Symbols: {() => e.symbols}</div>
                <div>Width: {() => Math.round(e.width).toString() + "px"}</div>
              </li>
            )}
          </ul>
        </For>
      </div>
    );
  }
}

export default class CodeGolf extends PluginController {
  static id = "code-golf" as const;
  static enabledByDefault = false;

  expressionItemCostPanel(
    model: ExpressionModel,
    el: HTMLDivElement
  ): Inserter {
    return () => <ExpressionItemCostPanel model={() => model} el={() => el} />;
  }

  folderCostPanel(model: FolderModel) {
    return () => <FolderCostPanel model={() => model}></FolderCostPanel>;
  }

  afterConfigChange(): void {}

  afterEnable() {
    this.dsm.pillboxMenus?.addPillboxButton({
      id: "dsm-codegolf-menu",
      tooltip: "code-golf-name",
      iconClass: "dcg-icon-keyboard",
      popup: () => <Menu></Menu>,
    });
  }

  afterDisable() {}
}
