# Storybook Component Development

This document describes the Storybook setup for developing and visualizing MUI components in isolation.

## Overview

Storybook allows us to develop and test UI components independently from the main application, without needing to run the full server stack or mock WebSocket/Auth dependencies.

## Running Storybook

To run the Storybook development server, use the following command:

```bash
npm run storybook
```

This will start the server and open a new browser tab with the Storybook UI.

## Creating Stories

Stories are located in the `stories` directory. To create a new story, create a new file with the `.stories.tsx` extension. You can then use the Storybook API to define your stories.

## Mocking API Requests

This project uses the `msw-storybook-addon` to mock API requests in stories. This allows you to test components that fetch data from an API without having to run the actual backend.

To use the addon, you can define your mock API handlers in the `parameters` of your story. For example:

```typescript
export const MockedStory: Story = {
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/user', (req, res, ctx) => {
          return res(ctx.json({ name: 'John Doe' }));
        }),
      ],
    },
  },
};
```

## Accessibility Testing

This project uses the Storybook Accessibility Addon (`@storybook/addon-a11y`) to help identify and fix accessibility issues in components during development.

### How to Use the Addon

1.  **Open a Story**: Navigate to any component story in the Storybook UI.
2.  **Select the Accessibility Tab**: In the addons panel at the bottom of the screen, click on the "Accessibility" tab.
3.  **Review the Results**: The panel will display a list of automated accessibility checks.

## Benefits

- **Isolated Development**: Test components without full app context
- **Visual Testing**: Compare component states visually
- **Documentation**: Living documentation of component APIs
