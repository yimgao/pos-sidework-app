"""照片上传：配了 BLOB_READ_WRITE_TOKEN 就存 Vercel Blob（线上持久），
没配就走本地 backend/uploads（本地开发 / Docker 不变）。"""
import os
import urllib.request

BLOB_TOKEN = os.environ.get("BLOB_READ_WRITE_TOKEN", "")


def upload_to_blob(data: bytes, filename: str, content_type: str) -> str | None:
    if not BLOB_TOKEN:
        return None
    req = urllib.request.Request(
        f"https://blob.vercel-storage.com/{filename}",
        data=data, method="PUT",
        headers={"Authorization": f"Bearer {BLOB_TOKEN}",
                 "Content-Type": content_type or "application/octet-stream",
                 "x-add-random-suffix": "1"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        import json
        return json.load(resp)["url"]
