import { textModeExprToLatex, textToRaw } from "../../../text-mode-core";

console.log("sandbox is confirmed to be running!");

window.addEventListener("message", function (e) {
  const mainWindow = e.source as MessageEventSource;
  let result = "";

  if (mainWindow === null) return;

  function expression(expr: MinimalItemState) {
    mainWindow.postMessage(
      {
        type: "expression",
        expr,
        id: e.data.id,
      },
      e.origin
    );
  }

  function mq(str: string) {
    return str;
  }

  const tm: TextModeFunctions = {
    math(template) {
      console.log(template, template.raw[0]);
      const ltx = textModeExprToLatex(
        {
          ...e.data.tmConfig,
          parseDesmosLatex(...args) {
            console.log("parsedesmoslatex called", args);
          },
        },
        template.raw[0]
      );
      if (!ltx) throw new Error("bad text mode math expression");
      return ltx;
    },
    expr(template) {
      const [analysis, graphState] = textToRaw(
        e.data.tmConfig,
        template.raw[0]
      );
      if (!graphState) throw new Error("bad text mode parse");
      const firstExpr = graphState.expressions.list[0];
      if (!firstExpr) throw new Error("no first expression found");
      return firstExpr;
    },
  };

  function clear() {
    mainWindow.postMessage({ type: "clear", id: e.data.id }, e.origin);
  }

  console.log("tmconfig", e.data.tmConfig);

  try {
    // eslint-disable-next-line no-eval
    result = new Function("expression", "mq", "tm", "clear", e.data.code)(
      expression,
      mq,
      tm,
      clear
    );
  } catch (e) {
    result = "eval() threw an exception.";
    console.log("Thrown error while evaluating in sandbox", e);
  }
});
