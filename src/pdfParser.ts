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
      if (ext === ".pdf") {
        const data = await pdf(file);
        parsedResumes.push(data.text);
      } else if (ext === ".docx") {
        const { value } = await mammoth.extractRawText({ buffer: file });
        parsedResumes.push(value);
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }
    } catch (error) {
      console.error(`Error parsing resume (${filename}):`, error);
      parsedResumes.push(""); // Add empty if failed
    }
  }

  return parsedResumes;
}
