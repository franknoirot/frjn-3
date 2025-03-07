import { join } from "path";
import * as fsp from "fs/promises";

/**
 * @param {import("@11ty/eleventy").UserConfig} config
 * @param {{ contentTypes: { dir: string, name: string, layout: string }[], baseLayout?: string }} options
 */
export default async function addContentLayoutsPlugin(config, options) {
  config.addGlobalData("contentTypes", options.contentTypes);
  for (const { dir, name, layout } of options.contentTypes) {
    config.addCollection(name, function (collectionApi) {
      return collectionApi.getFilteredByGlob(`${dir}/**/*.md`);
    });

    config.on("eleventy.before", async ({ dir: baseDir }) => {
      const dirDataFile = join(baseDir.input, dir, `${name}.11tydata.json`);
      config.watchIgnores.add(dirDataFile);
      await fsp.writeFile(
        dirDataFile,
        JSON.stringify({
          layout,
        }),
      );
    });
    config.on("eleventy.after", async ({ dir: baseDir }) => {
      const dirDataFile = join(baseDir.input, dir, `${name}.11tydata.json`);
      await fsp.rm(dirDataFile);
    });
  }
}
