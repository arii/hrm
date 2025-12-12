
import fs from 'node:fs';
import path from 'node:path';

const componentPath = process.argv[2];

if (!componentPath) {
  console.error('Please provide a component path.');
  console.error('Usage: npm run storybook:scaffold components/MyComponent.tsx');
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), componentPath);

if (!fs.existsSync(absolutePath)) {
  console.error(`Component file not found at ${absolutePath}`);
  process.exit(1);
}

const dirName = path.dirname(absolutePath);
const fileName = path.basename(absolutePath);
const componentName = path.basename(fileName, path.extname(fileName));
const storyFileName = `${componentName}.stories.tsx`;
const storyPath = path.join(dirName, storyFileName);

if (fs.existsSync(storyPath)) {
  console.error(`Story file already exists at ${storyPath}`);
  process.exit(1);
}

const content = `import type { Meta, StoryObj } from '@storybook/react'
import ${componentName} from './${componentName}'

const meta: Meta<typeof ${componentName}> = {
  title: 'Components/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ${componentName}>

export const Default: Story = {
  args: {
    // TODO: Add default props here
  },
}
`;

fs.writeFileSync(storyPath, content);
console.log(`✅ Created story file at ${storyPath}`);
