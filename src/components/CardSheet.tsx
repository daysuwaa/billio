import { useState, type FormEvent } from "react";
import { CURRENCIES } from "../lib/money";
import { useStore } from "../lib/store";
import type { Currency } from "../lib/types";
import { useUI } from "../lib/ui";
import { Sheet } from "./Sheet";

export function CardSheet({ id }: { id?: string }) {
  const { cards, saveCard, deleteCard } = useStore();
  const { close, say } = useUI();
  const existing = id ? cards.find((c) => c.id === id) : undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [cur, setCur] = useState<Currency>(existing?.cur ?? "USD");
  const [last4, setLast4] = useState(existing?.last4 ?? "");
  const [err, setErr] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Give the card a nickname.");
    if (last4 && !/^\d{4}$/.test(last4))
      return setErr("Last 4 must be exactly 4 digits, or leave it empty.");
    saveCard({ id, name: name.trim(), cur, last4 });
    say("Saved");
    close();
  };

  return (
    <Sheet label={existing ? "Edit card" : "Add card"}>
      <form onSubmit={submit} noValidate>
        <h2>{existing ? "Edit card" : "Add card"}</h2>
        <p className="q-hint" style={{ margin: "-8px 0 14px" }}>
          A nickname is enough. Never enter your full card number, PIN or CVV
          here.
        </p>
        <div className="field">
          <label htmlFor="c-name">Nickname</label>
          <input
            id="c-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Virtual USD card"
            autoComplete="off"
          />
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="c-last">Last 4 digits (optional)</label>
            <input
              id="c-last"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="field">
            <label htmlFor="c-cur">Currency</label>
            <select
              id="c-cur"
              value={cur}
              onChange={(e) => setCur(e.target.value as Currency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="err" role="alert">
          {err}
        </p>
        <div className="stack">
          <button className="btn primary block" type="submit">
            Save
          </button>
          {existing ? (
            <button
              className="btn danger block"
              type="button"
              onClick={() => {
                deleteCard(existing.id);
                say("Card removed");
                close();
              }}
            >
              Remove card
            </button>
          ) : null}
          <button className="btn block" type="button" onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </Sheet>
  );
}
