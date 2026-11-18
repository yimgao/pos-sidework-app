"""照片地址：Blob 存的是完整 https 链接，直接用；本地存的是相对路径，拼 /uploads/。"""
import os

API_PUBLIC_URL = os.environ.get("API_PUBLIC_URL", "").rstrip("/")


def photo_url(photo_path: str | None) -> str:
    if not photo_path:
        return ""
    if photo_path.startswith("http://") or photo_path.startswith("https://"):
        return photo_path
    if API_PUBLIC_URL:
        return f"{API_PUBLIC_URL}/uploads/{photo_path}"
    return "/uploads/" + photo_path
