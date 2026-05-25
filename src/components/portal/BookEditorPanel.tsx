import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Upload, Download, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { editBookText, getBookEditorStatus } from "@/lib/book-editor.functions";

const PURPLE = "#3D0066";
const YELLOW = "#FFD700";

export function BookEditorPanel() {
  const qc = useQueryClient();
  const status = useServerFn(getBookEditorStatus);
  const edit = useServerFn(editBookText);
  const statusQ = useQuery({ queryKey: ["book-editor-status"], queryFn: () => status() });

  const [mode, setMode] = useState<string>("professional-polish");
  const [text, setText] = useState("");
  const [result, setResult] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const editMut = useMutation({
    mutationFn: () => edit({ data: { mode, text } }),
    onSuccess: (res) => {
      setResult(res.edited);
      qc.invalidateQueries({ queryKey: ["book-editor-status"] });
      toast.success(`Edited with ${res.modeLabel}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFile = async (file: File) => {
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".docx")) {
        // @ts-expect-error - no types for browser build
        const mammoth = await import("mammoth/mammoth.browser.js");
        const arrayBuffer = await file.arrayBuffer();
        const res = await (mammoth as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }).extractRawText({ arrayBuffer });
        setText(res.value);
        toast.success("DOCX loaded");
      } else if (name.endsWith(".pdf")) {
        toast.message("PDF detected", { description: "Please copy/paste the text from your PDF into the box." });
      } else if (name.endsWith(".txt") || name.endsWith(".md")) {
        setText(await file.text());
        toast.success("Text loaded");
      } else {
        toast.error("Unsupported file. Use DOCX, TXT, or paste text.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not read file");
    }
  };

  const downloadDocx = async () => {
    if (!result) return;
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const paragraphs = result.split(/\n+/).map(
      (line) => new Paragraph({ children: [new TextRun(line)] }),
    );
    const doc = new Document({ sections: [{ children: paragraphs }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edited-${Date.now()}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = statusQ.data;
  const remaining = s?.editsRemaining;
  const isInner = s?.isInnerCircle;

  return (
    <div
      className="rounded-2xl border p-6 md:col-span-2"
      style={{ borderColor: PURPLE, background: `linear-gradient(135deg, ${PURPLE}11, transparent)` }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: PURPLE }}>
            <BookOpen className="h-5 w-5" style={{ color: YELLOW }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI Book Editor</h2>
            <p className="text-xs text-muted-foreground">Polish your manuscript with AI</p>
          </div>
        </div>
        <div className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: YELLOW, color: PURPLE }}>
          {isInner ? "Inner Circle • Unlimited" : `Trial • ${remaining ?? "—"} edits left`}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(s?.modes ?? []).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`text-xs px-3 py-2 rounded-lg border font-medium transition ${
              mode === m.id ? "text-black" : "text-foreground border-border hover:bg-card"
            }`}
            style={mode === m.id ? { background: YELLOW, borderColor: YELLOW } : undefined}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          accept=".docx,.pdf,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" /> Upload DOCX / PDF / TXT
        </Button>
        <span className="text-xs text-muted-foreground">or paste your text below</span>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your chapter or manuscript here..."
        className="mt-3 min-h-[200px]"
      />

      <Button
        onClick={() => editMut.mutate()}
        disabled={editMut.isPending || text.trim().length < 20 || (!isInner && remaining === 0)}
        className="mt-3 w-full font-bold"
        style={{ background: YELLOW, color: PURPLE }}
      >
        {editMut.isPending ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Editing...</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" /> Edit with AI</>
        )}
      </Button>

      {result && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground">Edited Result</h3>
            <Button size="sm" variant="outline" onClick={downloadDocx}>
              <Download className="h-4 w-4 mr-2" /> Download DOCX
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground whitespace-pre-wrap max-h-[400px] overflow-y-auto">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
