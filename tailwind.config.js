// Installation:
//  1. https://nextui.org/docs/frameworks/vite
//  2. https://tailwindcss.com/docs/guides/vite
// tailwind.config.js
const { nextui } = require("@nextui-org/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
        // ...
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        nextui({
          prefix: "nextui", // prefix for themes variables
          addCommonColors: false, // override common colors (e.g. "blue", "green", "pink").
          defaultTheme: "dark", // default theme from the themes object
          defaultExtendTheme: "dark", // default theme to extend on custom themes
          layout: {}, // common layout tokens (applied to all themes)
          themes: {
            light: {
              layout: {}, // light theme layout tokens
              colors: {}, // light theme colors
            },
            dark: {
              layout: {}, // dark theme layout tokens
              colors: {}, // dark theme colors
            },
            // ... custom themes
          },
        }),
      ],
};
