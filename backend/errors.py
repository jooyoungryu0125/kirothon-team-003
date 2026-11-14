from fastapi import HTTPException


class ApiError(HTTPException):
    """모든 API 오류를 {"detail": "..."} 형식으로 응답하기 위한 예외 클래스."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)
