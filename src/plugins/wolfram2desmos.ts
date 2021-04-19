function onEnable() {
  // https://stackoverflow.com/a/11431812/7481517
  window.postMessage(
    {
      type: "enable-script",
      scriptName: "wolfram2desmos",
    },
    "*"
  );
}

export default {
  name: "wolfram2desmos",
  description: "Convert ASCIImath into Desmos LaTeX on paste.",
  onEnable: onEnable,
  enabledByDefault: true,
};
