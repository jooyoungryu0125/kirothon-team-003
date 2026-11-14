import GorillaMascot from "./GorillaMascot";

export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-2 py-8">
      <GorillaMascot size={72} />
      <p className="text-sm text-text-secondary">고릴래? 잠깐만요…</p>
    </div>
  );
}
