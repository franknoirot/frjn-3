import { glob } from "glob";
import * as fsp from "fs/promises";

/**
 * @param {import("@11ty/eleventy").UserConfig} config
 * @param {{ patterns: string[], encoding: import("fs/promises").readFileSync.args[1] }} options
 */
export default async function addInputDirectoryPlugin(config, options) {
  const patternMatchFiles = await Promise.all(
    options.patterns.map((p) => glob(p)),
  );
  for (const filePath of patternMatchFiles.flat()) {
    // naive implementation
    const targetTemplatePath = filePath.slice(filePath.indexOf("/") + 1);

    const fileContent = await fsp.readFile(
      filePath,
      options.encoding ?? "utf-8",
    );

    config.addTemplate(targetTemplatePath, fileContent);
  }
  // Watch targets are relative to the input directory I believe
  options.patterns.forEach((p) => config.addWatchTarget(p));
  config.addWatchTarget("../../pages/**");
}
