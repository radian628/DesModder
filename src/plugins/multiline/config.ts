import { ConfigItem } from "plugins";

export const configList = [
  {
    type: "number",
    default: 300,
    min: 0,
    max: Infinity,
    step: 0.001,
    key: "widthBeforeMultiline",
  },
] satisfies ConfigItem[];

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Config {
  widthBeforeMultiline: number;
}
