import GorillaMascot from "./GorillaMascot";
import { GORILLA_LINES } from "../lib/gorillaLines";

export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-2 py-8" role="status">
      <GorillaMascot size={72} />
      <p className="text-sm text-text-secondary">{GORILLA_LINES.loading}</p>
    </div>
  );
}
