import antfu from "@antfu/eslint-config";

export default antfu(
  {
    type: "app",
    formatters: false,
    stylistic: {
      indent: 2,
      semi: true,
      quotes: "double",
    },
    ignores: ["**/migrations/*"],
  },
  {
    rules: {
      "no-console": ["warn"],
      "antfu/no-top-level-await": ["off"],
    },
  },
);
