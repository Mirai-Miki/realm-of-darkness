import { defineCollection } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";

export const collections = {
  docs: defineCollection({
    loader: glob({
      base: "../../packages/content/collections/mechanics",
      pattern: "**/*.mdx",
    }),
    schema: docsSchema(),
  }),
};
