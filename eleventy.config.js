import { InputPathToUrlTransformPlugin } from "@11ty/eleventy";
import addContentLayoutsPlugin from "./addContentLayoutsPlugin.js";
import addInputDirectoryPlugin from "./addInputDirectoryPlugin.js";
import markdownItFootnote from "markdown-it-footnote";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";

const contentTypes = ["posts", "books", "projects", "now"];
const excludeFromNav = ["now"];

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
  const outputAssetsPath = "/assets";
  eleventyConfig.setInputDirectory("content/public");
  eleventyConfig.setIncludesDirectory("../../_includes/");
  eleventyConfig.ignores.add("content/private");
  eleventyConfig.addPassthroughCopy({
    "content/public/_assets": outputAssetsPath,
    "_includes/styles": "/styles",
  });
  eleventyConfig.addGlobalData("layout", "layouts/base.njk");
  await eleventyConfig.addPlugin(addInputDirectoryPlugin, {
    patterns: ["./pages/**.md", "./pages/**.njk", "./pages/**.liquid"],
    format: "utf-8",
  });

  // Get the first `n` elements of a collection.
  // From https://github.com/11ty/eleventy-base-blog/blob/9baac5c4e3a007b404bed28152c5a3586c5da03a/_config/filters.js#L14C2-L24C5
  eleventyConfig.addFilter("head", (array, n) => {
    if (!Array.isArray(array) || array.length === 0) {
      return [];
    }
    if (n < 0) {
      return array.slice(n);
    }

    return array.slice(0, n);
  });

  // Format the passed in date string as specified in the dateStyle option
  eleventyConfig.addFilter("formatDate", (dateString, dateStyle = "medium") => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { dateStyle });
  });
  eleventyConfig.addPlugin(InputPathToUrlTransformPlugin);

  await eleventyConfig.addPlugin(addContentLayoutsPlugin, {
    contentTypes: contentTypes.map((t) => ({
      dir: "content/public/" + t,
      name: t,
      layout: `layouts/${t}.njk`,
    })),
  });

  eleventyConfig.addPreprocessor(
    "obsidian:images",
    "njk,md,liquid",
    (data, content) => {
      // matches "![[someimage.jpg]]" as well as "![[someimage.jpg | This is some alt test]]"
      // capturing the url and the alt text separately
      const wikiLinkImages = new RegExp(/!\[\[(.*?)\s*(?:\|\s*(.*?))?\]\]/g);
      // matches "![some alt text](someimage.jpg)" for the same transformation
      const mdImages = new RegExp(/!\[(.*?)\]\((.*?)\)/g);
      // Prepend the image file name with the assets folder output location, leaving everything else the same

      const withMdLinksReplaced = content.replaceAll(
        mdImages,
        (match, alt, url) => {
          const newUrl = `${outputAssetsPath}/${url}`;
          return `![${alt}](${newUrl})`;
        },
      );
      const withWikiLinksReplaced = withMdLinksReplaced.replaceAll(
        wikiLinkImages,
        (match, url, alt) => {
          const newUrl = `${outputAssetsPath}/${url}`;
          const newAlt = alt ? ` "${alt}"` : "";
          return `![${url}${newAlt}](${newUrl})`;
        },
      );
      return withWikiLinksReplaced;
    },
  );

  let inputMap = {};
  eleventyConfig.on(
    "eleventy.contentMap",
    async ({ inputPathToUrl, urlToInputPath }) => {
      // inputPathToUrl is an object mapping input file paths to output URLs
      // urlToInputPath is an object mapping output URLs to input file paths
      inputMap = Object.entries(inputPathToUrl);
    },
  );
  /**
   * Obsidian is clever and lets users not include the full path to a file in a link,
   * and supports both wikilink and markdown syntax. This preprocessor will find all
   * the links in the content and replace them with the correct output path, all in markdown syntax.
   */
  eleventyConfig.addTransform("obsidian:links", async (content) => {
    // matches "[[some-file-slug]]" as well as "[[some-file-slug | some link text]]"
    // capturing the slug and the link text separately
    const wikiLinks = new RegExp(/\[\[(.*?)\s*(?:\|\s*(.*?))?\]\]/g);
    // matches "[some link text](some-file-slug)" for the same transformation
    // without matching on "![some alt text](someimage.jpg)" which is a different transformation
    const mdLinks = new RegExp(/\[(.*?)\]\((.*?)\)/g);

    const withMdLinksReplaced = content.replaceAll(
      mdLinks,
      (match, text, slug) => {
        const newUrl = inputMap.find(([key]) =>
          key.includes("/" + slug),
        )?.[1][0];
        console.log("link found", match, text, slug, newUrl);
        if (newUrl) {
          return `<a href="${newUrl}">${text || slug}</a>`;
        } else {
          return match;
        }
      },
    );
    const withWikiLinksReplaced = withMdLinksReplaced.replaceAll(
      wikiLinks,
      (match, slug, text) => {
        const newUrl = inputMap.find(([key]) =>
          key.includes("/" + slug),
        )?.[1][0];
        if (newUrl) {
          return `<a href="${newUrl}">${text || slug}</a>`;
        } else {
          return text || match;
        }
      },
    );
    return withWikiLinksReplaced;
  });

  /**
   * Adding any backlinks to each piece of content as computed data
   */
  eleventyConfig.addGlobalData("eleventyComputed.backlinks", () => {
    return (data) => {
      const { url, fileSlug } = data.page;
      return data.collections.all
        .filter(
          (item) => item.url !== url && item.page.rawInput.includes(fileSlug),
        )
        .map((item) => ({ url: item.url, title: item.data.title }));
    };
  });

  /**
   * An opinionated shortcode to sort by a (possibly nested) key on each item in a collection
   * @param {Array} arr - the array to sort
   * @param {string} key - an attribute to sort by. Can use dot notation to access nested attributes
   * @param {boolean} reverse - whether to sort in reverse order
   */
  eleventyConfig.addFilter("sortByKey", (arr, key, reverse) => {
    function applyKey(obj, keyPath) {
      let r = { ...obj };
      const pathSegments = keyPath.split(".");
      for (const s of pathSegments) {
        r = r[s];
      }
      return r;
    }

    return arr.sort((a, b) => {
      const retrievedA = applyKey(a, key);
      const retrievedB = applyKey(b, key);
      if (retrievedA === undefined || retrievedB === undefined) {
        return 0;
      }
      if (typeof retrievedA === "string") {
        return reverse
          ? retrievedB.localeCompare(retrievedA)
          : retrievedA.localeCompare(retrievedB);
      } else {
        return reverse ? retrievedB - retrievedA : retrievedA - retrievedB;
      }
    });
  });

  eleventyConfig.amendLibrary("md", (mdLib) => mdLib.use(markdownItFootnote));
  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.addFilter("stripCollectionForSearch", (collection) =>
    collection.map((item) => ({
      url: item.url,
      title: item.data.title,
      description: item.data.description,
      contentType: item.url.split("/")[1],
    })),
  );
}
