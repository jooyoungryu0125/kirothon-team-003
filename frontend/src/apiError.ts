/** 2xx가 아닌 응답은 status와 서버의 detail 문장을 담아 던진다. 네트워크 오류는 status = 0. */
export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}
