import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Clipboard, X, AlertCircle } from "lucide-react";

interface ResumeInputProps {
  onResumeLoaded: (text: string, fileName: string) => void;
}

export default function ResumeInput({ onResumeLoaded }: ResumeInputProps) {
  const [pasteText, setPasteText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError("");
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";

      if (ext === "txt" || ext === "md" || ext === "tex" || ext === "latex") {
        const text = await file.text();
        onResumeLoaded(text, file.name);
      } else if (ext === "pdf") {
        const text = await extractPDFText(file);
        onResumeLoaded(text, file.name);
      } else if (ext === "docx" || ext === "doc") {
        const text = await file.text();
        // Basic DOCX extraction (plain text from XML)
        const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        onResumeLoaded(cleaned, file.name);
      } else {
        // Try as text
        const text = await file.text();
        onResumeLoaded(text, file.name);
      }
    } catch (err) {
      console.error("File processing error:", err);
      setError(`Failed to process ${file.name}. Please try pasting the content instead.`);
    } finally {
      setIsProcessing(false);
    }
  }, [onResumeLoaded]);

  const extractPDFText = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const textParts: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");
        textParts.push(pageText);
      }

      return textParts.join("\n\n");
    } catch (err) {
      console.error("PDF extraction error:", err);
      throw new Error("Could not extract text from PDF. The file may be image-based or encrypted.");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handlePasteSubmit = useCallback(() => {
    if (pasteText.trim()) {
      onResumeLoaded(pasteText.trim(), "Pasted Resume");
      setPasteText("");
    }
  }, [pasteText, onResumeLoaded]);

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <div className="mb-4 flex size-14 items-center justify-center rounded-xl bg-muted">
            <Upload className="size-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground">
            Drop your resume here, or click to browse
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Supports PDF, TXT, Markdown, LaTeX, and DOCX
          </p>
          {isProcessing && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Processing {fileName}...
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.tex,.latex,.docx,.doc"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-3 text-muted-foreground">or paste your resume</span>
        </div>
      </div>

      {/* Paste Area */}
      <div className="space-y-3">
        <Textarea
          ref={textareaRef}
          placeholder="Paste your resume content here...&#10;&#10;Supports plain text, Markdown, LaTeX/Overleaf source, or any text-based format."
          className="min-h-[240px] font-mono text-sm"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {pasteText && (
              <Badge variant="secondary" className="text-xs">
                {pasteText.split(/\s+/).filter(Boolean).length} words
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {pasteText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setPasteText(""); textareaRef.current?.focus(); }}
              >
                <X className="mr-1 size-3" />
                Clear
              </Button>
            )}
            <Button
              size="sm"
              disabled={!pasteText.trim()}
              onClick={handlePasteSubmit}
            >
              <FileText className="mr-1.5 size-3.5" />
              Analyze Resume
            </Button>
          </div>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Supported formats</p>
        <div className="flex flex-wrap gap-1.5">
          {["PDF", "TXT", "Markdown", "LaTeX/Overleaf", "DOCX", "Plain Text"].map((fmt) => (
            <Badge key={fmt} variant="outline" className="text-xs font-normal">
              {fmt}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
