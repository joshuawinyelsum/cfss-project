export function normalizeSurveyType(type: string): string {
  if (!type) return "";
  return type.toLowerCase().trim().replace(/[\s\-]+/g, '_');
}

