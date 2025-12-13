"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var generative_ai_1 = require("@google/generative-ai");
var promises_1 = require("fs/promises");
var path_1 = __importDefault(require("path"));
// Simple arg parsing
var args = process.argv.slice(2);
var getArg = function (key) {
    var index = args.indexOf(key);
    if (index !== -1 && index + 1 < args.length)
        return args[index + 1];
    return null;
};
var task = getArg('--task');
var taskFile = getArg('--task-file');
var contextFiles = ((_a = getArg('--context')) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
var outputFile = getArg('--output');
var preset = getArg('--preset');
// List of models to try in order.
// Prioritizing newer models as requested to fix 404 errors with older/deprecated ones.
var MODEL_FALLBACKS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
];
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, genAI, contextContent, _i, contextFiles_1, file, trimmedFile, content, error_1, finalTask, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey) {
                        console.error('Error: GEMINI_API_KEY environment variable is not set.');
                        process.exit(1);
                    }
                    genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
                    contextContent = '';
                    _i = 0, contextFiles_1 = contextFiles;
                    _a.label = 1;
                case 1:
                    if (!(_i < contextFiles_1.length)) return [3 /*break*/, 6];
                    file = contextFiles_1[_i];
                    trimmedFile = file.trim();
                    if (!trimmedFile)
                        return [3 /*break*/, 5];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, promises_1.readFile)(path_1.default.resolve(process.cwd(), trimmedFile), 'utf-8')];
                case 3:
                    content = _a.sent();
                    contextContent += "\n\n--- Start of Context File: ".concat(trimmedFile, " ---\n").concat(content, "\n--- End of Context File: ").concat(trimmedFile, " ---\n");
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.warn("Warning: Could not read context file ".concat(trimmedFile, ": ").concat(error_1.message));
                    contextContent += "\n\n--- Context File: ".concat(trimmedFile, " (MISSING/ERROR) ---\n");
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6:
                    if (!(preset === 'review')) return [3 /*break*/, 8];
                    return [4 /*yield*/, runReviewPreset(genAI, contextContent, outputFile)];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 14];
                case 8:
                    finalTask = task;
                    if (!taskFile) return [3 /*break*/, 12];
                    _a.label = 9;
                case 9:
                    _a.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, (0, promises_1.readFile)(path_1.default.resolve(process.cwd(), taskFile), 'utf-8')];
                case 10:
                    finalTask = _a.sent();
                    return [3 /*break*/, 12];
                case 11:
                    e_1 = _a.sent();
                    console.error("Error reading task file ".concat(taskFile, ":"), e_1);
                    process.exit(1);
                    return [3 /*break*/, 12];
                case 12:
                    if (!finalTask) {
                        console.error('Usage: npx tsx scripts/gemini-client.ts --task "task description" OR --task-file "path/to/task.txt" [--context "file1.md,file2.md"] [--output "output.md"]');
                        process.exit(1);
                    }
                    return [4 /*yield*/, runGenericTask(genAI, finalTask, contextContent, outputFile)];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14: return [2 /*return*/];
            }
        });
    });
}
function generateContentWithFallback(genAI, prompt, config) {
    return __awaiter(this, void 0, void 0, function () {
        var lastError, _i, MODEL_FALLBACKS_1, modelName, model, result, error_2, isNotFound, isBadRequest;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _i = 0, MODEL_FALLBACKS_1 = MODEL_FALLBACKS;
                    _c.label = 1;
                case 1:
                    if (!(_i < MODEL_FALLBACKS_1.length)) return [3 /*break*/, 6];
                    modelName = MODEL_FALLBACKS_1[_i];
                    console.log("Attempting to use model: ".concat(modelName, "..."));
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    model = genAI.getGenerativeModel({ model: modelName });
                    return [4 /*yield*/, model.generateContent(__assign({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }, config))];
                case 3:
                    result = _c.sent();
                    console.log("Successfully generated content using ".concat(modelName, "."));
                    return [2 /*return*/, result.response.text()];
                case 4:
                    error_2 = _c.sent();
                    lastError = error_2;
                    isNotFound = ((_a = error_2.message) === null || _a === void 0 ? void 0 : _a.includes('404')) || error_2.status === 404;
                    isBadRequest = ((_b = error_2.message) === null || _b === void 0 ? void 0 : _b.includes('400')) || error_2.status === 400;
                    if (isNotFound || isBadRequest) {
                        console.warn("Model ".concat(modelName, " failed (Not Found/Invalid). Trying next model..."));
                        return [3 /*break*/, 5];
                    }
                    // If it's another error (e.g., auth, quota), throw immediately
                    throw error_2;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: throw new Error("All models failed. Last error: ".concat(lastError === null || lastError === void 0 ? void 0 : lastError.message));
            }
        });
    });
}
function runGenericTask(genAI, task, contextContent, outputFile) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt, text, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prompt = "\nYou are an AI assistant helping with a software project.\nPlease use the provided context files to inform your response.\nDo not hallucinate content that is not in the context files if you are asked about specifics of the project.\n\n".concat(contextContent, "\n\n--- Task ---\n").concat(task, "\n");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, generateContentWithFallback(genAI, prompt)];
                case 2:
                    text = _a.sent();
                    return [4 /*yield*/, writeOutput(text, outputFile)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _a.sent();
                    handleError(error_3);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function runReviewPreset(genAI, contextContent, outputFile) {
    return __awaiter(this, void 0, void 0, function () {
        var prTitle, prAuthor, prHeadRef, prBaseRef, prDescription, diffFile, diff, e_2, maxDiffLength, truncatedDiff, prompt, text, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prTitle = process.env.PR_TITLE || 'Unknown Title';
                    prAuthor = process.env.PR_AUTHOR || 'Unknown Author';
                    prHeadRef = process.env.PR_HEAD_REF || 'unknown-head';
                    prBaseRef = process.env.PR_BASE_REF || 'unknown-base';
                    prDescription = process.env.PR_DESCRIPTION || 'No description.';
                    diffFile = process.env.PR_DIFF_FILE;
                    if (!diffFile) {
                        console.error('Error: PR_DIFF_FILE env var is required for review preset');
                        process.exit(1);
                    }
                    diff = '';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, promises_1.readFile)(diffFile, 'utf-8')];
                case 2:
                    diff = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _a.sent();
                    console.error("Error reading diff file ".concat(diffFile, ":"), e_2);
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4:
                    maxDiffLength = 50000;
                    truncatedDiff = diff.length > maxDiffLength ? diff.substring(0, maxDiffLength) + "\n...[DIFF TRUNCATED]" : diff;
                    prompt = "\n    **Role:** You are a Principal Software Engineer acting as a strict, critical code reviewer.\n\n    **Task:** Review the following Pull Request Diff.\n\n    **Context:**\n    - **PR Title:** ".concat(prTitle, "\n    - **Author:** ").concat(prAuthor, "\n    - **Branches:** ").concat(prHeadRef, " -> ").concat(prBaseRef, "\n    - **Description:** ").concat(prDescription, "\n\n    **Project Documentation & Guidelines (Use these to inform your review):**\n    ").concat(contextContent, "\n\n    **Critical Instructions:**\n    1. **Be Skeptical:** Your default stance is to request changes. Only approve if the code is excellent.\n    2. **Scope Enforcement:**\n       - If this is a backend PR, FLAG any frontend changes or snapshot updates as \"Suspicious Scope Creep\".\n       - If this is a refactor, FLAG any logic changes that aren't pure cleanup.\n    3. **File Audit:** You MUST list every single file changed.\n       - For each file, provide a specific comment.\n       - If a file has no obvious issues, you must still explicitly state \"Checked - No issues\".\n       - If a file change seems unnecessary, ask \"Why was this file modified?\".\n    4. **Large Changes:** If the diff is large, suggest splitting the PR.\n    5. **Suggestions:** Provide code snippets for fixes.\n\n    **Output Format (JSON):**\n    {\n      \"reviewComment\": \"Markdown string containing: \\n\\n### \uD83D\uDEE1\uFE0F Security & Quality Summary\\n[Summary]\\n\\n### \uD83D\uDCC2 File-by-File Audit\\n- **file1.ts**: [Comment]\\n- **file2.tsx**: [Comment]\\n...\\n\\n### \uD83D\uDCA1 Critical Feedback\\n[Deep dive]\",\n      \"labels\": [\"size-label\", \"status-label\"]\n    }\n\n    **Valid Labels:**\n    - Size: 'small', 'medium', 'large', 'xl'\n    - Status: 'needs-improvement', 'abandon', 'ready-for-approval'\n\n    **Diff:**\n    ").concat(truncatedDiff, "\n  ");
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 8, , 9]);
                    return [4 /*yield*/, generateContentWithFallback(genAI, prompt, {
                            generationConfig: {
                                responseMimeType: 'application/json',
                                responseSchema: {
                                    type: generative_ai_1.SchemaType.OBJECT,
                                    properties: {
                                        reviewComment: { type: generative_ai_1.SchemaType.STRING },
                                        labels: {
                                            type: generative_ai_1.SchemaType.ARRAY,
                                            items: { type: generative_ai_1.SchemaType.STRING }
                                        }
                                    },
                                    required: ['reviewComment', 'labels']
                                }
                            }
                        })];
                case 6:
                    text = _a.sent();
                    return [4 /*yield*/, writeOutput(text, outputFile)];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 8:
                    error_4 = _a.sent();
                    handleError(error_4);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
function writeOutput(content, outputFile) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!outputFile) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, promises_1.writeFile)(path_1.default.resolve(process.cwd(), outputFile), content)];
                case 1:
                    _a.sent();
                    console.log("Output written to ".concat(outputFile));
                    return [3 /*break*/, 3];
                case 2:
                    console.log(content);
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function handleError(error) {
    var _a;
    console.error('Error generating content:', error);
    if (error instanceof generative_ai_1.GoogleGenerativeAIError || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('404'))) {
        console.error('\nPOSSIBLE CAUSE: All attempted models failed.');
        console.error('Please check your Google AI Studio account and ensure you have access to the Gemini models.');
        console.error("Tried models: ".concat(MODEL_FALLBACKS.join(', ')));
    }
    process.exit(1);
}
main();
