// .storybook/test-runner-jest.config.ts
import type { Config } from "jest";
import { getJestConfig } from "@storybook/test-runner";

const testRunnerConfig: Config = getJestConfig();

const config: Config = {
  ...testRunnerConfig,
  /**
   * By default, the test-runner Jest config excludes node_modules from transformations.
   * This is problematic for us because MUI is published as raw ES modules.
   * This config overrides the default transformIgnorePatterns to allow Jest to transform MUI.
   *
   * @see https://github.com/storybookjs/test-runner/issues/84#issuecomment-1105232571
   * @see https://mui.com/material-ui/guides/testing/#jest
   */
  transformIgnorePatterns: [
    ...testRunnerConfig.transformIgnorePatterns.filter(
      (pattern) => pattern !== "/node_modules/"
    ),
    "node_modules/(?!(@mui|@babel|uuid))",
  ],
};

export default config;
