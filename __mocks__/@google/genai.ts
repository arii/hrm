// services/__mocks__/@google/genai.ts

export const mockGenerateContent = jest.fn();
export const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

export const GoogleGenerativeAI = jest.fn(() => ({
  getGenerativeModel: mockGetGenerativeModel,
}));

export const Type = {
  OBJECT: 'OBJECT',
  STRING: 'STRING',
  ARRAY: 'ARRAY',
  INTEGER: 'INTEGER',
};
