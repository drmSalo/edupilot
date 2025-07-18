import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "./pdfWorker"; // Pfad anpassen je nach Struktur

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Extrahiert Text aus einer PDF-Datei.
 * @param file PDF-Datei als File-Objekt
 * @returns Textinhalt als String
 */
export async function uploadPDFAndExtractText(file: File): Promise<string> {
  const fileReader = new FileReader();

  return new Promise((resolve, reject) => {
    fileReader.onload = async function () {
      try {
        const typedArray = new Uint8Array(this.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(" ") + "\n";
        }

        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };

    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(file);
  });
}
