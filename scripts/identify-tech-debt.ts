import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import {
  generateContentWithFallback,
  JsonProcessor,
  cleanJsonOutput,
} from './gemini-client';

// Simple arg parsing
const getArg = (key: string) => {
  const args = process.argv.slice(2);
  const index = args.indexOf(key);
  if (index !== -1 && index + 1 < args.length) return args[index + 1];
  return null;
};

interface TechDebtIssue {
  title: string;
  description: string;
  fingerprint: string;
}

interface TechDebtResponse {
  issues: TechDebtIssue[];
}

export function isTechDebtResponse(data: unknown): data is TechDebtResponse {
    if (typeof data !== 'object' || data === null || !('issues' in data)) {
        return false;
    }

    const issues = (data as { issues: unknown }).issues;
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
        typeof item.fingerprint === 'string'
    );
}


export async function main() {
  const diffFile = getArg('--diff-file');
  const outputFile = getArg('--output');

  if (!diffFile || !outputFile) {
    console.error('Usage: tsx scripts/identify-tech-debt.ts --diff-file <path/to/diff> --output <path/to/output.json>');
    process.exit(1);
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Error: GEMINI_API_KEY environment variable is not set.');
      process.exit(1);
    }
    const genAI = new GoogleGenerativeAI(apiKey);

    const diffContent = await readFile(path.resolve(process.cwd(), diffFile), 'utf-8');
    let promptTemplate = await readFile(path.resolve(process.cwd(), 'prompts/tech-debt-analysis.md'), 'utf-8');

    const prompt = promptTemplate.replace('{{diff}}', diffContent);

    const rawResponse = await generateContentWithFallback(
        genAI,
        prompt,
        {
            generationConfig: { responseMimeType: 'application/json' },
        }
    );

    const cleanedResponse = cleanJsonOutput(rawResponse || '');
    const jsonProcessor = new JsonProcessor();
    const result = jsonProcessor.process(cleanedResponse);

    if (result.success && isTechDebtResponse(result.data)) {
        await writeFile(path.resolve(process.cwd(), outputFile), JSON.stringify(result.data, null, 2));
        console.log(`Technical debt analysis complete. Results written to ${outputFile}`);
    } else {
        console.error('Error: Failed to parse valid technical debt JSON from the model response.');
        // Log the invalid data for debugging
        console.error('Invalid data:', JSON.stringify(result.data, null, 2));
        // Write an empty array to the output to avoid breaking downstream workflows
        await writeFile(path.resolve(process.cwd(), outputFile), JSON.stringify({ issues: [] }, null, 2));
        // Exit with a non-zero code to indicate failure
        process.exit(1);
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    // Write an empty array on error as well
    if (outputFile) {
        try {
            await writeFile(path.resolve(process.cwd(), outputFile), JSON.stringify({ issues: [] }, null, 2));
        } catch (writeError) {
            console.error('Failed to write empty output file:', writeError);
        }
    }
    process.exit(1);
  }
}

// Only run main() when the script is executed directly
if (process.env.NODE_ENV !== 'test') {
    main();
}
