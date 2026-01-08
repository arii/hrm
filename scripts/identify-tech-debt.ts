import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import {
  generateContentWithFallback,
  JsonProcessor,
  cleanJsonOutput,
} from './gemini-client';

// Helper to parse command-line arguments
const getArg = (key: string): string | null => {
  const args = process.argv.slice(2);
  const index = args.indexOf(key);
  if (index !== -1 && index + 1 < args.length) {
    // Coalesce to null to satisfy TypeScript's strict null checks
    return args[index + 1] ?? null;
  }
  return null;
};

interface TechDebtIssue {
  title: string
  description: string
  fingerprint: string;
}

interface TechDebtResponse {
  issues: TechDebtIssue[];
}

export function isTechDebtResponse(data: unknown): data is TechDebtResponse {
  if (typeof data !== 'object' || data === null || !('issues' in data)) {
    return false;
  }

  const { issues } = data as { issues: unknown };
  if (!Array.isArray(issues)) {
    return false;
  }

  return issues.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'title' in item &&
      typeof item.title === 'string' &&
      'description' in item &&
      typeof item.description === 'string' &&
      'fingerprint' in item &&
      typeof item.fingerprint === 'string',
  );
}


export async function main() {
  const outputFile = getArg('--output');
  // Stop parsing after '--files' to treat all subsequent args as file paths
  const fileArgs = process.argv.slice(process.argv.indexOf('--files') + 1);

  if (!outputFile || fileArgs.length === 0) {
    console.error(
      'Usage: tsx scripts/identify-tech-debt.ts --output <path/to/output.json> --files <file1> <file2> ...'
    );
    process.exit(1);
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const allIssues: TechDebtIssue[] = [];

    const promptTemplate = await readFile(
      path.resolve(process.cwd(), 'prompts/tech-debt-analysis.md'),
      'utf-8',
    );

    for (const file of fileArgs) {
      console.log(`Analyzing file: ${file}`);
      try {
        const fileContent = await readFile(path.resolve(process.cwd(), file), 'utf-8');
        const codeBlock = `File: ${file}\n\`\`\`\n${fileContent}\n\`\`\``;
        const prompt = promptTemplate.replace('{{code}}', codeBlock);

        const rawResponse = await generateContentWithFallback({
          genAI,
          prompt,
          config: {
            generationConfig: { responseMimeType: 'application/json' },
          },
        });

        const cleanedResponse = cleanJsonOutput(rawResponse || '');
        const jsonProcessor = new JsonProcessor();
        const result = jsonProcessor.process(cleanedResponse);

        if (result.success && isTechDebtResponse(result.data)) {
          if (result.data.issues.length > 0) {
            console.log(`Found ${result.data.issues.length} potential issues in ${file}.`);
            allIssues.push(...result.data.issues);
          }
        } else {
          console.warn(`Warning: Failed to parse valid technical debt JSON for ${file}.`);
          console.warn('Invalid data:', JSON.stringify(result.data, null, 2));
        }
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
      }
    }

    const finalOutput: TechDebtResponse = { issues: allIssues };
    await writeFile(
      path.resolve(process.cwd(), outputFile),
      JSON.stringify(finalOutput, null, 2)
    );

    console.log(
      `Technical debt analysis complete. Found a total of ${allIssues.length} issues. Results written to ${outputFile}`
    );

  } catch (error) {
    console.error('An unexpected error occurred during the analysis process:', error);
    // Write an empty array on error to ensure downstream jobs don't fail
    if (outputFile) {
      try {
        await writeFile(
          path.resolve(process.cwd(), outputFile),
          JSON.stringify({ issues: [] }, null, 2)
        );
      } catch (writeError) {
        console.error('Failed to write empty output file:', writeError);
      }
    }
    process.exit(1);
  }
}

// Only run main() when the script is executed directly
if (process.env.NODE_ENV !== 'test') {
  main()
}
