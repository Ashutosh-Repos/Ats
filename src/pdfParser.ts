import pdf from "pdf-parse";
import mammoth from "mammoth";
import path from "path";

export async function parseResumes(
  files: Buffer[],
  filenames: string[]
): Promise<string[]> {
  const parsedResumes: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filename = filenames[i];
    const ext = path.extname(filename).toLowerCase();

    try {
      let text = "";

      if (ext === ".pdf") {
        const data = await pdf(file);
        text = data.text;
      } else if (ext === ".docx") {
        const { value } = await mammoth.extractRawText({ buffer: file });
        text = value;
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }

      const trimmedText = text.trim();
      console.log(
        `[PARSE DEBUG] ${filename}: extracted ${trimmedText.length} characters`
      );

      parsedResumes.push(trimmedText);
    } catch (error) {
      console.error(`[PARSE ERROR] ${filename}:`, error);
      parsedResumes.push(""); // Mark failed parse with empty string
    }
  }

  return parsedResumes;
}
