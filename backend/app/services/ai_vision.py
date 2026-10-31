"""照片预筛：只标存疑，永不自动判不合格、不改复核结果。

两档：
1. 没配 AI key：只做文件检查（文件在不在、是不是图片/视频、多大），
   结论永远是 needs_review，经理仍需自己看照片。
2. 配了 key（AI_PROVIDER=openai|gemini，AI_API_KEY，AI_VISION_MODEL）：
   走 OpenAI 兼容接口发图问一句，返回 looks_done / unclear / not_done，
   unclear 和 not_done 都只标给经理看，复核仍由经理点通过/打回。

成本口径（供参考，以各家官网价目为准）：做这件事用 Flash-Lite 级
模型最划算，单张图约千分之几美元；本店一天几十张照片，一个月
通常几美元以内。视频不要整段发 AI，先抽帧或只让经理看，视频
API 按秒计费、贵得多。
"""
import base64
import json
import os
import urllib.request


def _call_vision(image_path: str, task_title: str, lang: str) -> dict:
    provider = os.environ.get("AI_PROVIDER", "gemini").lower()
    api_key = os.environ.get("AI_API_KEY", "")
    model = os.environ.get("AI_VISION_MODEL", "gemini-2.5-flash-lite")
    if provider == "openai":
        url = os.environ.get("AI_BASE_URL", "https://api.openai.com/v1/chat/completions")
    else:
        url = os.environ.get("AI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    prompt = ("You are checking restaurant sidework evidence. Task: %s. "
              "Does this photo show this task completed? Reply JSON only: "
              '{"verdict": "looks_done|unclear|not_done", "reason": "one short sentence"}.' % task_title)
    body = json.dumps({"model": model, "messages": [{"role": "user", "content": [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b64}}]}],
        "max_tokens": 200}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "Authorization": "Bearer " + api_key})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode())
    text = data["choices"][0]["message"]["content"]
    try:
        parsed = json.loads(text[text.index("{"):text.rindex("}") + 1])
    except Exception:
        parsed = {"verdict": "unclear", "reason": text[:200]}
    return {"verdict": parsed.get("verdict", "unclear"), "reason": parsed.get("reason", ""),
            "provider": provider, "model": model, "mode": "ai"}


def screen_photo(file_path: str, task_title: str, lang: str = "en") -> dict:
    zh = lang == "zh"
    if not file_path or not os.path.exists(file_path):
        return {"status": "no_file", "verdict": "unclear",
                "reason": "没有照片文件" if zh else "No photo file", "mode": "file_check"}
    ext = os.path.splitext(file_path)[1].lower()
    if ext in (".mp4", ".mov", ".webm"):
        return {"status": "needs_review", "verdict": "unclear",
                "reason": "视频不自动判，经理直接看视频" if zh else "Video is not auto-checked, manager watches it directly",
                "mode": "file_check"}
    size_kb = os.path.getsize(file_path) // 1024
    if size_kb < 2:
        return {"status": "flagged", "verdict": "unclear",
                "reason": "文件过小，可能是空白或损坏图，请经理重点看" if zh else "File too small, possibly blank or corrupt, manager should check closely",
                "mode": "file_check", "size_kb": size_kb}
    if os.environ.get("AI_API_KEY"):
        try:
            r = _call_vision(file_path, task_title, lang)
            r["status"] = "looks_done" if r["verdict"] == "looks_done" else "needs_review"
            r["size_kb"] = size_kb
            return r
        except Exception as e:
            return {"status": "needs_review", "verdict": "unclear",
                    "reason": ("AI 调用失败，转人工复核：" + str(e)[:100]) if zh else ("AI call failed, fall back to manual review: " + str(e)[:100]),
                    "mode": "ai_error", "size_kb": size_kb}
    return {"status": "needs_review", "verdict": "unclear",
            "reason": "未配 AI key，只做了文件检查（文件存在、是图片），内容仍需经理看" if zh else
                    "No AI key configured, file check only (file exists, is an image), manager still checks content",
            "mode": "file_check", "size_kb": size_kb}
