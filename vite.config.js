import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import path from "node:path";

const assets = path.resolve("node_modules/@phosphor-icons/core/assets");

// Inlines official Phosphor SVGs at build time: <i class="ph ph-phone"> / <i class="ph-fill ph-star">
function phosphorInline() {
  return {
    name: "phosphor-inline",
    transformIndexHtml(html) {
      return html.replace(
        /<i class="(ph|ph-fill) ph-([a-z0-9-]+)"([^>]*)><\/i>/g,
        (_, weight, name, rest) => {
          const file =
            weight === "ph-fill"
              ? path.join(assets, "fill", `${name}-fill.svg`)
              : path.join(assets, "regular", `${name}.svg`);
          const svg = readFileSync(file, "utf8")
            .replace(/<svg /, `<svg class="icon"${rest} width="1em" height="1em" focusable="false" `);
          return svg;
        }
      );
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [phosphorInline()],
});
