import { Component, jsx } from "#DCGView";
import { Calc } from "src/globals";
import { PluginController } from "../PluginController";
import { format } from "#i18n";
import { Tooltip } from "src/components";

export class AntiLagMenu extends Component {
  template() {
    return (
      <div class="dcg-popover-menu dsm-anti-lag-menu">
        <div class="dcg-popover-interior">
          <Tooltip
            gravity="s"
            tooltip={format("anti-lag-kill-workers-tooltip")}
          >
            <button
              onClick={() => {
                for (const w of Calc.controller.evaluator.workerPool.workers)
                  Calc.controller.evaluator.workerPool.killWorker(w);
                setTimeout(() => {
                  Calc.controller._showToast({
                    message: format("anti-lag-kill-workers-toast"),
                  });
                  console.log("got ehre");
                });
              }}
            >
              {format("anti-lag-kill-workers")}
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }
}

export default class AntiLag extends PluginController {
  static id = "anti-lag" as const;
  static enabledByDefault = true;

  afterConfigChange(): void {}

  afterEnable() {
    this.dsm.pillboxMenus?.addPillboxButton({
      id: "dsm-anti-lag-menu",
      tooltip: "anti-lag-name",
      iconClass: "dsm-icon-pie-chart",
      popup: () => <AntiLagMenu></AntiLagMenu>,
    });
  }

  afterDisable() {
    this.dsm.pillboxMenus?.removePillboxButton("dsm-anti-lag-menu");
  }
}
