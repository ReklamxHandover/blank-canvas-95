import { useEffect, useRef, useState } from "react";
import { Calculator as CalcIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Op = "+" | "-" | "×" | "÷";

let _setCalculatorOpen: React.Dispatch<React.SetStateAction<boolean>> | null = null;

export function toggleCalculator() {
  _setCalculatorOpen?.((prev) => !prev);
}

export function FloatingCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const flashTimer = useRef<number | null>(null);

  const reset = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setOverwrite(true);
  };

  const flash = (label: string) => {
    setFlashKey(label);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlashKey(null), 140);
  };

  useEffect(() => {
    _setCalculatorOpen = setOpen;
    return () => { _setCalculatorOpen = null; };
  }, []);

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const backspace = () => {
    setDisplay((c) => (c.length <= 1 || overwrite ? "0" : c.slice(0, -1)));
    if (display.length <= 1) setOverwrite(true);
  };

  const inputDigit = (d: string) => {
    setDisplay((cur) => {
      if (overwrite) {
        setOverwrite(false);
        return d;
      }
      if (cur.length >= 14) return cur;
      return cur === "0" ? d : cur + d;
    });
  };

  const inputDot = () => {
    if (overwrite) {
      setDisplay("0.");
      setOverwrite(false);
      return;
    }
    setDisplay((cur) => (cur.includes(".") ? cur : cur + "."));
  };

  const compute = (a: number, b: number, o: Op) => {
    switch (o) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
    }
  };

  const fmt = (n: number) => {
    if (!isFinite(n)) return "Error";
    const s = Number(n.toPrecision(12)).toString();
    return s.length > 14 ? n.toExponential(6) : s;
  };

  const chooseOp = (next: Op) => {
    const cur = parseFloat(display);
    if (prev === null) {
      setPrev(cur);
    } else if (!overwrite && op) {
      const r = compute(prev, cur, op);
      setPrev(r);
      setDisplay(fmt(r));
    }
    setOp(next);
    setOverwrite(true);
  };

  const equals = () => {
    if (op === null || prev === null) return;
    const cur = parseFloat(display);
    const r = compute(prev, cur, op);
    setDisplay(fmt(r));
    setPrev(null);
    setOp(null);
    setOverwrite(true);
  };

  // Keyboard handling — capture phase so app shortcuts don't fire while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      let matched: string | null = null;

      if (k === "Escape") {
        matched = "C";
        reset();
      } else if (k === "Enter" || k === "=") {
        matched = "=";
        equals();
      } else if (k === "Backspace") {
        matched = "⌫";
        backspace();
      } else if (k === "+") {
        matched = "+";
        chooseOp("+");
      } else if (k === "-") {
        matched = "−";
        chooseOp("-");
      } else if (k === "*") {
        matched = "×";
        chooseOp("×");
      } else if (k === "/") {
        matched = "÷";
        chooseOp("÷");
      } else if (k === "." || k === ",") {
        matched = ".";
        inputDot();
      } else if (/^[0-9]$/.test(k)) {
        matched = k;
        inputDigit(k);
      }

      if (matched !== null) {
        e.preventDefault();
        e.stopPropagation();
        flash(matched);
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(t) &&
        btnRef.current &&
        !btnRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, display, prev, op, overwrite]);

  const keys: Array<{ label: string; onClick: () => void; variant?: "op" | "eq" | "clear" }> = [
    { label: "C", onClick: reset, variant: "clear" },
    { label: "÷", onClick: () => chooseOp("÷"), variant: "op" },
    { label: "×", onClick: () => chooseOp("×"), variant: "op" },
    { label: "⌫", onClick: backspace, variant: "op" },
    { label: "7", onClick: () => inputDigit("7") },
    { label: "8", onClick: () => inputDigit("8") },
    { label: "9", onClick: () => inputDigit("9") },
    { label: "−", onClick: () => chooseOp("-"), variant: "op" },
    { label: "4", onClick: () => inputDigit("4") },
    { label: "5", onClick: () => inputDigit("5") },
    { label: "6", onClick: () => inputDigit("6") },
    { label: "+", onClick: () => chooseOp("+"), variant: "op" },
    { label: "1", onClick: () => inputDigit("1") },
    { label: "2", onClick: () => inputDigit("2") },
    { label: "3", onClick: () => inputDigit("3") },
    { label: "=", onClick: equals, variant: "eq" },
    { label: "0", onClick: () => inputDigit("0") },
    { label: ".", onClick: inputDot },
  ];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Open calculator"
        onClick={() => setOpen((o) => !o)}
        className="calculator-fab fixed bottom-4 right-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:bg-accent"
      >
        <CalcIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Calculator"
          className="fixed bottom-20 right-4 z-[60] w-64 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Kalkylator</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mb-2 min-h-12 rounded-md border border-border bg-muted px-3 py-2 text-right font-mono text-2xl leading-tight text-foreground break-all">
            {display}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {keys.map((k, i) => {
              const isEq = k.variant === "eq";
              const isOp = k.variant === "op";
              const isClear = k.variant === "clear";
              const spanZero = k.label === "0";
              const isFlashing = flashKey === k.label;
              return (
                <Button
                  key={i}
                  type="button"
                  onClick={k.onClick}
                  variant={isEq ? "default" : isOp || isClear ? "secondary" : "outline"}
                  className={`h-10 px-0 text-base font-medium transition-all ${spanZero ? "col-span-2" : ""} ${isFlashing ? "ring-2 ring-ring scale-95 brightness-125" : ""}`}
                >
                  {k.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
