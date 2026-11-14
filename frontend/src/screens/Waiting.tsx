import type { RoomState } from "../types";
import Badge from "../components/Badge";
import Card from "../components/Card";
import ProgressBar from "../components/ProgressBar";

interface Props {
  room: RoomState;
  submitting?: boolean;
}

export default function Waiting({ room, submitting }: Props) {
  const total = room.members.length;
  const done = room.members.filter((m) => m.voted).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{room.topic}</h1>
        <p className="text-base text-text-secondary">
          {submitting ? "투표를 보내고 있어요" : "다른 사람들이 고르는 중이에요"}
        </p>
      </div>
      <Card className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-text-primary">
          {total}명 중 {done}명 완료
        </p>
        <ProgressBar current={done} total={total} />
        <ul className="flex flex-col gap-2">
          {room.members.map((m) => (
            <li key={m.member_id} className="flex items-center justify-between text-base text-text-primary">
              <span>{m.nickname}</span>
              {m.voted ? (
                <Badge className="text-success">완료 ✓</Badge>
              ) : (
                <span className="text-xs text-text-muted">고르는 중</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
