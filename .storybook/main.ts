import type { StorybookConfig } from "@storybook/react-webpack5";
import path from "path";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)", "../components/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  staticDirs: ["../public"],
  docs: {
    autodocs: "tag",
  },
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": path.resolve(__dirname, "../"),
      };
    }
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve("babel-loader"),
          options: {
            presets: [
              require.resolve("@babel/preset-env"),
              require.resolve("@babel/preset-typescript"),
              [
                require.resolve("@babel/preset-react"),
                {
                  runtime: "automatic",
                },
              ],
            ],
          },
        },
      ],
    });
    return config;
  },
  babel: async (options) => {
    options.presets = [
      ...options.presets,
      [
        "@babel/preset-react",
        {
          runtime: "automatic",
        },
        "preset-react-jsx-transform", // Can be removed in Storybook 8
      ],
    ];
    return options;
  },
};
export default config;