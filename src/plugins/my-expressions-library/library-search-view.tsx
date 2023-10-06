import MyExpressionsLibrary, {
  ExpressionLibraryExpression,
  ExpressionLibraryMathExpression,
} from ".";
import "./library-search.less";
import { Component, jsx, mountToNode } from "DCGView";
import { For } from "components";
import StaticMathquillView from "components/StaticMathQuillView";
import { format } from "i18n/i18n-core";

export function expressionLibraryMathExpressionView(
  expr: ExpressionLibraryMathExpression,
  observer: IntersectionObserver,
  container: any
) {
  // has to happen in a timeout since dom nodes aren't created immediately
  setTimeout(() => {
    const domNode = container._domNode as HTMLLIElement;
    // @ts-expect-error convenient way of passing handler into intersectionobserver
    domNode._onEnterView = () => {
      mountToNode(StaticMathquillView, domNode, {
        latex: () => expr.latex ?? "",
      });
      observer.unobserve(domNode);
    };

    observer.observe(domNode);
  }, 0);
}

export class LibrarySearchView extends Component<{
  plugin: () => MyExpressionsLibrary;
}> {
  template() {
    const observer = new IntersectionObserver(
      (evt) => {
        for (const entry of evt) {
          if (entry.isIntersecting) {
            // @ts-expect-error convenient way of passing handler into intersectionobserver
            entry.target._onEnterView?.();
          }
        }
      },
      { threshold: 0.5 }
    );

    return (
      <div class="dcg-popover-interior">
        <div class="dsm-library-search">
          <div class="libsearch-header" role="heading">
            {format("my-expressions-library-pillbox-menu")}
            <br></br>
            <input
              onClick={(evt: MouseEvent) => {
                if (evt.target instanceof HTMLElement) evt.target.focus();
              }}
              onInput={(e: InputEvent & { target: HTMLInputElement }) => {
                this.props.plugin().refineSearch(e.target.value);
              }}
              value={() => this.props.plugin().searchStr}
            ></input>
          </div>
          <For
            each={() => {
              return this.props.plugin().getLibraryExpressions();
            }}
            key={(expr) => expr.uniqueID}
          >
            <ul class="dsm-library-search-exprlist">
              {(expr: ExpressionLibraryExpression) => {
                switch (expr.type) {
                  case "expression": {
                    const container = (
                      <li
                        onClick={(_: MouseEvent) => {
                          void this.props.plugin().loadMathExpression(expr);
                        }}
                        style={{ "min-height": "20px", "overflow-x": "hidden" }}
                      ></li>
                    );
                    expressionLibraryMathExpressionView(
                      expr,
                      observer,
                      container
                    );
                    return container;
                  }
                  case "folder": {
                    return (
                      <li
                        class="dsm-library-search-folder"
                        onClick={() => {
                          void this.props.plugin().loadFolder(expr);
                        }}
                      >
                        <i class="dcg-icon-new-folder"></i>
                        {expr.text}
                      </li>
                    );
                  }
                  case "graph": {
                    return (
                      <li
                        class="dsm-library-search-graph"
                        onClick={() => {
                          void this.props.plugin().loadEntireGraph(expr);
                        }}
                      >
                        <i class="dcg-icon-cartesian"></i>
                        {expr.title}
                      </li>
                    );
                  }
                }
              }}
            </ul>
          </For>
        </div>
      </div>
    );
  }
}