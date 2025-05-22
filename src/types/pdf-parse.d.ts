// types/pdf-parse.d.ts
declare module "pdf-parse" {
  interface TextItem {
    str: string;
    dir?: string;
    width?: number;
    height?: number;
    transform?: number[];
    fontName?: string;
  }

  interface TextContent {
    items: TextItem[];
    styles: Record<string, unknown>;
  }

  interface Metadata {
    get: (key: string) => string | undefined;
    has: (key: string) => boolean;
    getAll: () => Record<string, string>;
    parse: () => Record<string, unknown>;
  }

  interface PDFPageProxy {
    getTextContent(): Promise<TextContent>;
  }

  interface PDFInfo {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Metadata | null;
    version: string;
    text: string;
  }

  interface PDFParseOptions {
    version?: string;
    pagerender?: (pageData: PDFPageProxy) => Promise<string>;
    max?: number;
    min?: number;
    info?: boolean;
    metadata?: boolean;
    text?: boolean;
  }

  function pdf(
    buffer: Buffer | Uint8Array,
    options?: PDFParseOptions
  ): Promise<PDFInfo>;

  export = pdf;
}
