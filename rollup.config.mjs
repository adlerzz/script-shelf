import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import svelte from "rollup-plugin-svelte";
import svelteConfig from "./svelte.config.mjs";
import { cp, mkdir, rm } from "node:fs/promises";

export default {
    input: { background: "src/background.ts", popup: "src/pages/popup.ts", manager: "src/pages/manager.ts" },
    output: {
        dir: "dist", format: "es", sourcemap: false,
        entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js",
    },
    onwarn (warning, warn) {
        // Svelte's runtime contains intentional internal cycles.
        if (warning.code === "CIRCULAR_DEPENDENCY" && warning.ids?.every(id => id.includes("/node_modules/svelte/"))) {
            return;
        }
        warn(warning);
    },
    plugins: [
        svelte({ compilerOptions: { ...svelteConfig.compilerOptions, dev: false }, emitCss: false }),
        nodeResolve({ browser: true, exportConditions: ["svelte", "browser"] }),
        typescript({ tsconfig: "./tsconfig.json", include: ["src/**/*.ts"] }),
        {
            name: "static-assets",
            async buildStart () {
                await rm("dist", { recursive: true, force: true });
            },
            async writeBundle () {
                await mkdir("dist", { recursive: true });
                await cp("public", "dist", { recursive: true });
            },
        },
    ],
};
