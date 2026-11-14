interface Props {
  /** 픽셀 크기 (정사각형) */
  size?: number;
  /** true이면 연핑크 배경이 들어 있는 이미지를 쓴다. */
  withBackground?: boolean;
  className?: string;
}

export default function GorillaMascot({ size = 120, withBackground = false, className = "" }: Props) {
  return (
    <img
      src={withBackground ? "/gorilla-pink.png" : "/gorilla.png"}
      alt="아무고릴라"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
