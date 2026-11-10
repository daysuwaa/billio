import { useUI } from "../lib/ui";
import { QuickAdd } from "./QuickAdd";
import { Sheet } from "./Sheet";

export function AddSheet() {
  const { close, open } = useUI();
  return (
    <Sheet label="Add a subscription">
      <h2>Add a subscription</h2>
      <p className="q-hint" style={{ margin: "-4px 0 14px" }}>
        Type it the way you would say it. Name, amount, how often, and the next
        date.
      </p>
      <QuickAdd onDone={close} autoFocus />
      <div className="stack" style={{ marginTop: 16 }}>
        <button
          className="btn block"
          type="button"
          onClick={() => open({ type: "sub" })}
        >
          Fill in the details
        </button>
        <button
          className="btn block"
          type="button"
          onClick={() => open({ type: "check" })}
        >
          Check a debit alert
        </button>
      </div>
    </Sheet>
  );
}
