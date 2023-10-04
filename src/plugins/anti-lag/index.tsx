import { Component, jsx } from "#DCGView";
import { Calc, ExpressionModel, ItemModel } from "src/globals";
import { PluginController } from "../PluginController";
import { format } from "#i18n";
import { Tooltip } from "src/components";

class LagPlaceholder extends Component<{
  model: ExpressionModel;
  antiLag: AntiLag;
}> {
  template() {
    return (
      <div class="dsm-anti-lag-placeholder">
        {format("dsm-anti-lag-big-expr", {
          size: this.props.model().latex?.toString() ?? "0",
        })}
      </div>
    );
  }
}

export default class AntiLag extends PluginController {
  static id = "anti-lag" as const;
  static enabledByDefault = true;

  lagPlaceholder(model: ExpressionModel) {
    return () => (
      <LagPlaceholder antiLag={() => this} model={() => model}></LagPlaceholder>
    );
  }

  afterConfigChange(): void {}

  afterEnable() {}

  afterDisable() {}
}
