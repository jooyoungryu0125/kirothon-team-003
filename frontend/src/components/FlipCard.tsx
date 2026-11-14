interface Props {
  name: string;
  appeals: string[];
  flipped: boolean;
  onToggle: () => void;
}

const hidden = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" } as const;

/** 세로형(3:4) 카드. 카드 영역을 누르면 뒤집힌다. */
export default function FlipCard({ name, appeals, flipped, onToggle }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={flipped ? "카드 앞면 보기" : "어필멘트 보기"}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="mx-auto aspect-3/4 w-full max-w-72 cursor-pointer rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative h-full w-full transition-transform duration-400 motion-reduce:transition-none"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* 앞면 */}
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl border border-border bg-pink-soft"
          style={hidden}
        >
          <img
            src="/gorilla-card-bg.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="relative flex h-full flex-col items-center justify-start px-6 pt-16 text-center">
            <p className="text-3xl font-bold tracking-tight break-keep text-text-primary">{name}</p>
          </div>
        </div>
        {/* 뒷면 */}
        <div
          className="absolute inset-0 flex flex-col gap-3 overflow-y-auto rounded-3xl border border-border bg-pink-soft p-5"
          style={{ ...hidden, transform: "rotateY(180deg)" }}
        >
          {appeals.length === 0 ? (
            <p className="m-auto text-center text-base text-text-secondary">어필 없이 등록된 후보예요 🤐</p>
          ) : (
            appeals.map((a, i) => (
              <p
                key={i}
                className="rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3 text-base text-text-primary"
              >
                {a}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
