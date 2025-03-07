# A template for a personal blog with content sourced from Obsidian

This is how my website, [franknoirot.co](https://franknoirot.co), is built. It's a static site generated with [11ty](https://11ty.dev), and the content is sourced from my notes in [Obsidian](https://obsidian.md/). This template bends over backwards to make sure that there is _absolutely no website-related content_ in the Obsidian vault. This is to ensure that the content is as portable as possible, and can be used in other contexts if needed, and to keep the editing experience in Obsidian as native as possible.

## Running the project

You'll need [`pnpm`](https://pnpm.io/) to install the dependencies. Once you have that installed, you can run the following commands:

```shell
pnpm install
pnpm start
```

and you'll have the site up and running with live reload (except for changes to the `pages/` directory, I don't know what's up with that).

## Content Sourcing

In my site, my content is sourced under the `content/` directory as a Git submodule, which lives as a private repository on Github. This opinionated blog looks for content in the `content/public/` directory (as opposed to the `content/private/` directory), and assets in the `content/_assets/` directory. Any directories in `content/public/` will be interpreted as content types (which need to be registered in the `eleventy.config.js` file as well), with any files within those child directories interpreted as content entries.

## Content layouts

A custom plugin written in this repo called `addContentLayoutsPlugin.js` will automatically add [frontmatter](https://www.11ty.dev/docs/data-frontmatter/) to each content type that gives it an 11ty layout of the same name. These layouts live in `_includes/layouts/`. If you add a content type but no corresponding layout, your build will fail.

## Website-y content

The site author can supplement these automatically created content types with manually created pages, in the aptly named `pages/` directory. This is how the listing pages of the site are managed, such as the `/books` page. All "website-y" content should go in this folder, in a layout that mirrors the content, and it will be merged with the content directory at build time. Thanks to 11ty's [data cascade](https://www.11ty.dev/docs/data-cascade/), you'll have access to collections and everything else within these layouts.
