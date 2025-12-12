
import fs from 'node:fs';
import path from 'node:path';

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });

  return arrayOfFiles;
}

const componentsDir = path.resolve(process.cwd(), 'components');
const allFiles = getAllFiles(componentsDir);

const componentFiles = allFiles.filter(
  (file) =>
    file.endsWith('.tsx') &&
    !file.endsWith('.stories.tsx') &&
    !file.endsWith('.test.tsx') &&
    !file.includes('__tests__')
);

const storyFiles = allFiles.filter((file) => file.endsWith('.stories.tsx'));

const missingStories: string[] = [];

componentFiles.forEach((componentFile) => {
  const dir = path.dirname(componentFile);
  const name = path.basename(componentFile, '.tsx');
  const storyFile = path.join(dir, `${name}.stories.tsx`);

  if (!fs.existsSync(storyFile)) {
    missingStories.push(path.relative(process.cwd(), componentFile));
  }
});

const coverage = ((componentFiles.length - missingStories.length) / componentFiles.length) * 100;

console.log('\n📊 Storybook Coverage Report');
console.log('============================');
console.log(`Total Components: ${componentFiles.length}`);
console.log(`Total Stories:    ${storyFiles.length}`);
console.log(`Coverage:         ${coverage.toFixed(1)}%\n`);

if (missingStories.length > 0) {
  console.log('❌ Missing Stories for:');
  missingStories.forEach((file) => console.log(`   - ${file}`));
  console.log('\nTo scaffold a story, run:');
  console.log(`npm run storybook:scaffold <path-to-component>`);
  process.exit(1);
} else {
  console.log('✅ All components have stories!');
  process.exit(0);
}
