import React from "react";

export type SummarySize = "small" | "medium" | "big";

interface Props {
  open: boolean;
  initialSize?: SummarySize;
  onClose: () => void;
  onConfirm: (size: SummarySize) => void;
  colors: {
    GLASS: string;
    BORDER: string;
    PRIMARY: string;
    ACCENT: string;
    SUBTLE: string;
    TEXT: string;
  };
}

const SummarySizeModal: React.FC<Props> = ({
  open,
  initialSize = "small",
  onClose,
  onConfirm,
  colors,
}) => {
  const [selectedSize, setSelectedSize] = React.useState<SummarySize>(initialSize);

  React.useEffect(() => setSelectedSize(initialSize), [initialSize]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ background: colors.GLASS, border: `1px solid ${colors.BORDER}`, backdropFilter: "blur(10px)" }}
      >
        <h2 className="mb-4 text-lg font-bold">Choose summary size</h2>

        <div className="grid gap-3">
          <label
            className={`cursor-pointer rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
              selectedSize === "small" ? "ring-2 ring-emerald-400" : ""
            }`}
            style={{ borderColor: colors.BORDER, background: "rgba(255,255,255,0.02)" }}
          >
            <input
              type="radio"
              name="summary-size"
              value="small"
              checked={selectedSize === "small"}
              onChange={() => setSelectedSize("small")}
              className="mt-1"
            />
            <div>
              <div className="font-semibold">Small (5–10 pages)</div>
              <div className="text-xs" style={{ color: colors.SUBTLE }}>
                Nur das Wichtigste – potenzielle Prüfungsfragen im Fokus.
              </div>
            </div>
          </label>

          <label
            className={`cursor-pointer rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
              selectedSize === "medium" ? "ring-2 ring-blue-400" : ""
            }`}
            style={{ borderColor: colors.BORDER, background: "rgba(255,255,255,0.02)" }}
          >
            <input
              type="radio"
              name="summary-size"
              value="medium"
              checked={selectedSize === "medium"}
              onChange={() => setSelectedSize("medium")}
              className="mt-1"
            />
            <div>
              <div className="font-semibold">Medium (11–20 pages)</div>
              <div className="text-xs" style={{ color: colors.SUBTLE }}>
                Mehr Details, trotzdem prüfungsorientiert.
              </div>
            </div>
          </label>

          <label
            className={`cursor-pointer rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
              selectedSize === "big" ? "ring-2 ring-purple-400" : ""
            }`}
            style={{ borderColor: colors.BORDER, background: "rgba(255,255,255,0.02)" }}
          >
            <input
              type="radio"
              name="summary-size"
              value="big"
              checked={selectedSize === "big"}
              onChange={() => setSelectedSize("big")}
              className="mt-1"
            />
            <div>
              <div className="font-semibold">Big (25–30 pages)</div>
              <div className="text-xs" style={{ color: colors.SUBTLE }}>
                Breiter Überblick plus Kernstellen – ideal zum tiefen Lernen.
              </div>
            </div>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm"
            style={{ border: `1px solid ${colors.BORDER}`, background: "rgba(255,255,255,0.02)", color: colors.TEXT }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedSize)}
            className="rounded-xl px-4 py-2 text-sm font-bold"
            style={{ color: "#00131a", backgroundImage: `linear-gradient(90deg, ${colors.PRIMARY}, ${colors.ACCENT})`, border: "none" }}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummarySizeModal;
