function extractJson(text) {
  if (!text) return null;

  // 1. Try to find markdown code block
  const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = text.match(jsonRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  // 2. If no backticks, try to find the first '{' and last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1).trim();
  }

  // 3. Fallback to just trimming the input
  return text.trim();
}

function cleanResponse(text) {
  return text
    .replace(/[*_`]+/g, '')              // remove markdown chars (*, _, `)
    .replace(/\n{2,}/g, '\n\n')          // normalize multiple line breaks
    .replace(/^\s+|\s+$/g, '')           // trim leading/trailing whitespace
    .replace(/[ ]{2,}/g, ' ');           // normalize multiple spaces
}



export { extractJson, cleanResponse }