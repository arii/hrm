import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

// Simple arg parsing
const args = process.argv.slice(2);
const getArg = (key: string) => {
  const index = args.indexOf(key);
  if (index !== -1 && index + 1 < args.length) return args[index + 1];
  return null;
};

const task = getArg('--task');
const contextFiles = getArg('--context')?.split(',') || [];
const outputFile = getArg('--output');

if (!task) {
  console.error('Usage: npx tsx scripts/gemini-client.ts --task "task description" [--context "file1.md,file2.md"] [--output "output.md"]');
  process.exit(1);
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is not set.');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-1.5-flash for better context window and speed
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let contextContent = '';
  for (const file of contextFiles) {
    const trimmedFile = file.trim();
    if (!trimmedFile) continue;
    try {
      const content = await readFile(path.resolve(process.cwd(), trimmedFile), 'utf-8');
      contextContent += `\n\n--- Start of Context File: ${trimmedFile} ---\n${content}\n--- End of Context File: ${trimmedFile} ---\n`;
    } catch (error) {
      console.warn(`Warning: Could not read context file ${trimmedFile}: ${(error as Error).message}`);
      contextContent += `\n\n--- Context File: ${trimmedFile} (MISSING/ERROR) ---\n`;
    }
  }

  const prompt = `
You are an AI assistant helping with a software project.
Please use the provided context files to inform your response.
Do not hallucinate content that is not in the context files if you are asked about specifics of the project.

${contextContent}

--- Task ---
${task}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (outputFile) {
      await writeFile(path.resolve(process.cwd(), outputFile), text);
      console.log(`Output written to ${outputFile}`);
    } else {
      console.log(text);
    }
  } catch (error) {
    console.error('Error generating content:', error);
    process.exit(1);
  }
}

main();
