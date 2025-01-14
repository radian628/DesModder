import window, { Calc } from "globals/window";
import {
  plugins,
  pluginList,
  PluginID,
  GenericSettings,
  TransparentPlugins,
  IDToPluginSettings,
  PluginInstance,
} from "plugins";
import { postMessageUp, mapToRecord, recordToMap } from "utils/messages";

export default class MainController extends TransparentPlugins {
  /**
   * pluginsEnabled keeps track of what plugins the user wants enabled,
   * regardless of forceDisabled settings.
   */
  private readonly pluginsEnabled: Map<PluginID, boolean>;
  private readonly forceDisabled: Set<string>;
  readonly pluginSettings = Object.fromEntries(
    pluginList.map(
      (plugin) => [plugin.id, getDefaultConfig(plugin.id)] as const
    )
  ) as IDToPluginSettings;

  constructor() {
    super();
    // default values
    this.forceDisabled = window.DesModderPreload!.pluginsForceDisabled;
    if (Calc.controller.isGeometry()) this.forceDisabled.add("text-mode");
    this.pluginsEnabled = new Map(
      pluginList.map((plugin) => [plugin.id, plugin.enabledByDefault] as const)
    );
  }

  applyStoredEnabled(storedEnabled: Map<PluginID, boolean | undefined>) {
    for (const { id } of pluginList) {
      const stored = storedEnabled.get(id);
      if (stored !== undefined && id !== "GLesmos") {
        this.pluginsEnabled.set(id, stored);
      }
    }
  }

  applyStoredSettings(
    storedSettings: Map<PluginID, GenericSettings | undefined>
  ) {
    for (const { id } of pluginList) {
      const stored = storedSettings.get(id);
      if (stored !== undefined) {
        const settings = this.pluginSettings[id];
        for (const key in settings) {
          const storedValue = stored[key];
          if (storedValue !== undefined) {
            settings[key] = storedValue;
          }
        }
      }
    }
  }

  init() {
    const dsmPreload = window.DesModderPreload!;
    this.applyStoredSettings(recordToMap(dsmPreload.pluginSettings));
    this.applyStoredEnabled(recordToMap(dsmPreload.pluginsEnabled));
    delete window.DesModderPreload;

    for (const { id } of pluginList) {
      if (this.isPluginEnabled(id)) this._enablePlugin(id);
    }
    this.pillboxMenus?.updateMenuView();
    // The graph loaded before DesModder loaded, so DesModder was not available to
    // return true when asked isGlesmosMode. Refresh those expressions now
    this.glesmos?.checkGLesmos();
  }

  setPluginEnabled(id: PluginID, isEnabled: boolean) {
    if (isEnabled && this.isPluginForceDisabled(id)) return;
    const same = isEnabled === this.pluginsEnabled.get(id);
    this.pluginsEnabled.set(id, isEnabled);
    if (!same)
      postMessageUp({
        type: "set-plugins-enabled",
        value: mapToRecord(this.pluginsEnabled),
      });
  }

  disablePlugin(id: PluginID) {
    const plugin = plugins.get(id);
    if (plugin && this.isPluginToggleable(id)) {
      if (this.isPluginEnabled(id)) {
        const plugin = this.enabledPlugins[id];
        plugin?.beforeDisable();
        this.pluginsEnabled.delete(id);
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.enabledPlugins[id];
        this.setPluginEnabled(id, false);
        this.pillboxMenus?.updateMenuView();
        plugin?.afterDisable();
        Calc.controller.updateViews();
      }
    }
  }

  _enablePlugin(id: PluginID) {
    const Plugin = plugins.get(id);
    if (Plugin !== undefined) {
      const res = new Plugin(this, this.pluginSettings[id] as any as never);
      const ep = this.enabledPlugins as Record<PluginID, PluginInstance>;
      ep[Plugin.id] = res;
      (res as PluginInstance).settings = this.pluginSettings[id];
      this.setPluginEnabled(id, true);
      res.afterEnable();
      this.pillboxMenus?.updateMenuView();
      Calc.controller.updateViews();
    }
  }

  enablePlugin(id: PluginID) {
    if (this.isPluginToggleable(id) && !this.isPluginEnabled(id)) {
      this.setPluginEnabled(id, true);
      this._enablePlugin(id);
    }
  }

  togglePlugin(id: PluginID) {
    if (this.isPluginEnabled(id)) {
      this.disablePlugin(id);
    } else {
      this.enablePlugin(id);
    }
  }

  isPluginEnabled(id: PluginID) {
    return (
      !this.isPluginForceDisabled(id) && (this.pluginsEnabled.get(id) ?? false)
    );
  }

  isPluginForceDisabled(id: PluginID) {
    return this.forceDisabled.has(id);
  }

  isPluginForceEnabled(id: PluginID) {
    return !!plugins.get(id)?.forceEnabled;
  }

  isPluginToggleable(id: PluginID) {
    return !this.isPluginForceDisabled(id) && !this.isPluginForceEnabled(id);
  }

  togglePluginSettingBoolean(pluginID: PluginID, key: string) {
    const pluginSettings = this.pluginSettings[pluginID];
    if (pluginSettings)
      this.setPluginSetting(pluginID, key, !(pluginSettings[key] as boolean));
  }

  setPluginSetting(
    pluginID: PluginID,
    key: string,
    value: boolean | string,
    temporary: boolean = false
  ) {
    const pluginSettings = this.pluginSettings[pluginID];
    if (!pluginSettings) return;
    pluginSettings[key] = value;
    if (!temporary)
      postMessageUp({
        type: "set-plugin-settings",
        value: this.pluginSettings,
      });
    const plugin = this.enabledPlugins[pluginID];
    if (plugin) {
      plugin.settings = pluginSettings;
      plugin.afterConfigChange();
      Calc.controller.updateViews();
    }
    this.pillboxMenus?.updateMenuView();
  }

  commitStateChange(allowUndo: boolean) {
    Calc.controller.updateTheComputedWorld();
    if (allowUndo) {
      Calc.controller.commitUndoRedoSynchronously({ type: "dsm-blank" });
    }
    Calc.controller.updateViews();
  }
}

function getDefaultConfig(id: PluginID) {
  const out: GenericSettings = {};
  const config = plugins.get(id)?.config;
  if (config !== undefined) {
    for (const configItem of config) {
      out[configItem.key] = configItem.default;
    }
  }
  return out;
}
