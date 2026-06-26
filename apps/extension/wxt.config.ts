import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "wxt";



import pkg from "./package.json" with { type: "json" };


// TODO: postcss plugin still used for mantine. seems to work but it shouldnt. might be build cache

const INCLUDE_IWER = process.env.USE_IWER === "true" || process.env.USE_IWER === "1";
const ENVIRONMENT = process.env.NODE_ENV || "development";

if (INCLUDE_IWER && ENVIRONMENT === "production") {
    throw new Error("Not allowed to pass INCLUDE_IWER=1 in production builds");
}

const aliases: Record<string, string> = {}

if (!INCLUDE_IWER) {
    aliases["iwer"] =  "./src/shims/iwer.ts";
    aliases["@iwer/sem"] = "./src/shims/iwer-sem.ts";
    aliases["@iwer/devui"] = "./src/shims/iwer-devui.ts";
    aliases["@pmndrs/xr/emulate"] = "./src/shims/pmndrs-xr-emulate.ts";

    console.log("Shimmed out IWER modules");
}

const force_prebundle = [
    "@viewportvr/vr-engine > @react-three/xr",
    "@viewportvr/vr-engine > @react-three/xr > @pmndrs/xr",
    "@viewportvr/vr-engine > @react-three/xr > @pmndrs/xr > @pmndrs/msdfonts",
    "@viewportvr/vr-engine > @react-three/fiber",
    "@viewportvr/vr-engine > @react-three/drei",
    "@viewportvr/vr-engine > @react-three/uikit",
    "@viewportvr/vr-engine > @react-three/uikit-default",
    "@viewportvr/watch-ui > @react-three/uikit",
    "@viewportvr/watch-ui > @react-three/uikit-default",
    "@viewportvr/vr-engine > troika-three-text",
    "@viewportvr/vr-engine > three"
];

const LOG_COMPILATION = process.env.LOG_COMPILATION === "true" || process.env.LOG_COMPILATION === "1";

export default defineConfig({
    vite: () => ({
        plugins: [
            tailwindcss(),
            LOG_COMPILATION
                ? {
                      name: "comp-log",
                      enforce: "pre",
                      transform(code, id) {
                          if (
                              !id.includes("?vue") &&
                              !id.includes(".css") &&
                              !id.includes("\x00")
                          ) {
                              console.log(`[Compiling] ${id}`);
                          }
                          return null;
                      }
                  }
                : undefined,
            {
                name: "no-tsbuildinfo",
                enforce: "post",
                generateBundle(_, bundle) {
                    for (const file of Object.keys(bundle)) {
                        if (file.endsWith(".tsbuildinfo")) {
                            delete bundle[file];
                        }
                    }
                }
            },
            visualizer((outputOptions) => {
                const build_name = outputOptions.name
                    ? outputOptions.name
                          .replace(/[^a-z0-9]/gi, "-")
                          .toLowerCase()
                    : "extension";

                return {
                    filename: `stats/${build_name}.html`,
                    open: false
                };
            })
        ],
        assetsInclude: ["**/*.wasm"],
        optimizeDeps: {
            include: force_prebundle,
            exclude: ["argon2-browser"]
        }
    }),

    srcDir: "src",
    imports: {
        // @ts-ignore stop importing their slop into packages without my consent
        disabled: true,
        exclude: [/packages\//]
    },

    manifest: {
        name: "ViewportVR",
        version: pkg.version,
        description: pkg.description,
        host_permissions: ["https://*/*"],
        permissions: [
            "contextMenus",
            "tabCapture",
            "activeTab",
            "offscreen",
            "debugger",
            "storage"
        ],
        content_security_policy: {
            extension_pages:
                "script-src 'self' http://localhost:8097 'wasm-unsafe-eval'; object-src 'self';"
        }
    },

    alias: aliases,

    modules: ["@wxt-dev/auto-icons"],

    //@ts-ignore
    autoIcons: {
        baseIconPath: "./assets/icon.png",
        sizes: [16, 32, 48, 96, 128],
        developmentIndicator: "overlay"
    }
});
