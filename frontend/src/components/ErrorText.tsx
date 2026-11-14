interface Props {
  message?: string | null;
  className?: string;
}

/** 오류는 팝업 없이 화면 안에 danger 색 문구로 보여준다. */
export default function ErrorText({ message, className = "" }: Props) {
  if (!message) return null;
  return (
    <p role="alert" className={`text-sm text-danger ${className}`}>
      {message}
    </p>
  );
}
