import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, X, Upload, Download, Sparkles, Loader2 } from "lucide-react";
import { getBookEditorState, runBookEditor } from "@/lib/student-portal.functions";

const PURPLE = "#3D0066";
const YELLOW = "#FFD700";

type State = {
  isInnerCircle: boolean;
  editsUsed: number;
  editsRemaining: number | null;
  modes: { id: string; label: string }[];
};

export function BookEditorSheet({
  session,
  onClose,
}: {
  session: string;
  onClose: () => void;
}) {
  const fetchState = useServerFn(getBookEditorState);
  const runEdit = useServerFn(runBookEditor);

  const [state, setState] = useState<State | null>(null);
  const [mode, setMode] = useState("professional-polish");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchState({ data: { session } })
      .then((s) => setState(s as State))
      .catch((e: Error) => setError(e.message));
  }, [fetchState, session]);

  const onFile = async (file: File) => {
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith(".docx")) {
        // @ts-expect-error - browser build has no types
        const mammoth = await import("mammoth/mammoth.browser.js");
        const buf = await file.arrayBuffer();
        const res = await (
          mammoth as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }
        ).extractRawText({ arrayBuffer: buf });
        setText(res.value);
      } else if (name.endsWith(".txt") || name.endsWith(".md")) {
        setText(await file.text());
      } else if (name.endsWith(".pdf")) {
        setError("PDF detected — please copy/paste the text into the box.");
      } else {
        setError("Unsupported file. Use DOCX, TXT, or paste text.");
      }
    } catch (e) {
      console.error(e);
      setError("Could not read file");
    }
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await runEdit({ data: { session, mode, text } });
      setResult(res.edited);
      setState((s) =>
        s
          ? { ...s, editsUsed: res.editsUsed, editsRemaining: res.editsRemaining, isInnerCircle: res.isInnerCircle }
          : s,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
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

  const remaining = state?.editsRemaining;
  const isInner = state?.isInnerCircle;
  const canEdit = !!state && (isInner || (remaining ?? 0) > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6"
        style={{
          background: "linear-gradient(135deg, #140024, #1a0a2e)",
          border: `1px solid ${PURPLE}`,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ background: PURPLE }}
            >
              <BookOpen className="h-5 w-5" style={{ color: YELLOW }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Book Editor</h2>
              <p className="text-xs text-white/60">Polish your manuscript with AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {state && (
          <div
            className="text-xs px-3 py-1.5 rounded-full font-semibold inline-block mb-4"
            style={{ background: YELLOW, color: PURPLE }}
          >
            {isInner ? "Inner Circle • Unlimited" : `Trial • ${remaining ?? "—"} edits left`}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {(state?.modes ?? []).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`text-xs px-3 py-2 rounded-lg border font-medium transition ${
                mode === m.id ? "text-black" : "text-white border-white/15 hover:bg-white/5"
              }`}
              style={mode === m.id ? { background: YELLOW, borderColor: YELLOW } : undefined}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
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
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 inline-flex items-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" /> Upload DOCX / TXT
          </button>
          <span className="text-xs text-white/50">or paste below</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your chapter or manuscript here..."
          className="w-full min-h-[180px] rounded-xl bg-black/40 border border-white/10 p-3 text-sm text-white outline-none focus:border-purple-500"
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={loading || text.trim().length < 20 || !canEdit}
          className="mt-3 w-full py-3 rounded-xl font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: YELLOW, color: PURPLE }}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Editing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Edit with AI
            </>
          )}
        </button>

        {result && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">Edited Result</h3>
              <button
                onClick={downloadDocx}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 inline-flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> Download DOCX
              </button>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
