import { join } from "path";
import * as fsp from "fs/promises";

/**
 * @param {import("@11ty/eleventy").UserConfig} config
 * @param {{ contentTypes: { dir: string, name: string, layout: string, permalink?: string }[], baseLayout?: string }} options
 */
export default async function addContentLayoutsPlugin(config, options) {
  config.addGlobalData("contentTypes", options.contentTypes);
  config.addGlobalData(
    "navContentTypes",
    options.contentTypes.filter((t) => !t.excludeFromNav),
  );
  for (const { dir, name, layout, permalink } of options.contentTypes) {
    config.addCollection(name, function (collectionApi) {
      return collectionApi.getFilteredByGlob(`${dir}/**/*.md`);
    });

    config.on("eleventy.before", async ({ dir: baseDir }) => {
      const dirDataFile = join(baseDir.input, dir, `${name}.11tydata.json`);
      config.watchIgnores.add(dirDataFile);
      const layoutFrontMatter = {
        layout,
      };
      if (permalink) {
        layoutFrontMatter.permalink = permalink;
      }
      await fsp.writeFile(dirDataFile, JSON.stringify(layoutFrontMatter));
    });
    config.on("eleventy.after", async ({ dir: baseDir }) => {
      const dirDataFile = join(baseDir.input, dir, `${name}.11tydata.json`);
      await fsp.rm(dirDataFile);
    });
  }
}
