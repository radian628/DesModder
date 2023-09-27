/* eslint-disable no-console */
import { esbuildPluginInline } from "./loaders/esbuild-plugin-inline.mjs";
import { esbuildPluginLezer } from "./loaders/esbuild-plugin-lezer.mjs";
import { esbuildPluginReplacements } from "./loaders/esbuild-plugin-replacements.mjs";
import { loadFile } from "./loaders/utils.mjs";
import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";
import { lessLoader } from "esbuild-plugin-less";
import { promises as fs } from "fs";
import parseArgs from "minimist-lite";
import * as path from "node:path";

const argv = parseArgs(process.argv.slice(2));

const unindent2spaces = (s) => s.toString().replaceAll(/\n {2}|\n\s*$/g, "\n");

// plugin for the ?raw query param
// to make "raw" resources use the text loader
const rawQueryParamPlugin = {
  name: "raw",
  setup(build) {
    build.onResolve({ filter: /\?.*raw/ }, (args) => {
      return {
        path: path.join(args.resolveDir, args.path),
        namespace: "raw-ns",
      };
    });
    build.onLoad({ filter: /.*/, namespace: "raw-ns" }, async (args) => {
      return {
        contents: (
          await fs.readFile(args.path.replace(/\?.*$/, ""))
        ).toString(),
        loader: "text",
      };
    });
  },
};

if (argv.help) {
  console.log(
    unindent2spaces`Usage:
    node esbuild.mjs [options]
  
  Options:
    --help         Show help
    --browser=...  Browser target: "firefox", or "chrome"  [default: "chrome"]
    --watch        Watch mode: rebuild on file system changes [default: false]
    --outdir=...   Output directory                          [default: "dist"]
    
  Examples:
    # Dev server for Chrome
    node esbuild.mjs --watch --browser=chrome
    
    # Final build for Firefox
    node esbuild.mjs --browser=firefox`
  );
  process.exit(0);
}

if (
  argv.browser !== undefined &&
  !["firefox", "chrome"].includes(argv.browser)
) {
  console.error(`Invalid browser name: ${argv.browser}`);
  process.exit(1);
}
const { version } = JSON.parse(await loadFile("./package.json"));
const browser = argv.browser ?? "chrome";
const watch = !!argv.watch;
const outdir = argv.outdir ?? "dist";

const opts = {
  entryPoints: [
    "src/background.ts",
    "src/script.ts",
    "src/preload/content.ts",
    "src/preload/script.ts",
    "src/plugins/computed-expressions/sandbox-src.ts",
  ],
  // don't include source map on release builds
  sourcemap: watch ? "inline" : false,
  bundle: true,
  outdir,
  plugins: [
    lessLoader(),
    esbuildPluginInline(),
    esbuildPluginLezer(),
    esbuildPluginReplacements(),
    rawQueryParamPlugin,
    // The copy plugin *should* support array or glob "from", but I encountered
    //    error: Cannot read properties of undefined (reading 'slice')
    //    at setup (node_modules/esbuild-plugin-copy/dist/index.mjs:69:23)
    copy({
      resolveFrom: "cwd",
      assets: {
        from: [`./public/${browser}/*`],
        to: outdir,
      },
    }),
    copy({
      resolveFrom: "cwd",
      assets: {
        from: [`./public/common/*`],
        to: outdir,
      },
    }),
  ],
  define: {
    BROWSER: JSON.stringify(browser),
    VERSION: JSON.stringify(version),
  },
  loader: {
    ".ts": "ts",
    ".ftl": "text",
    ".woff": "dataurl",
    ".html": "text",
  },
  logLevel: "info",
};

// clean dist folder
try {
  await fs.rm(outdir, { recursive: true });
} catch (e) {
  // permit no dist folder to begin with
  if (e?.code !== "ENOENT") throw e;
}

if (watch) {
  const ctx = await esbuild.context(opts);
  await ctx.rebuild();
  await ctx.watch();
} else {
  void esbuild.build(opts);
}
