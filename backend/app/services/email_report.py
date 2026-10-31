"""日报发邮件：配了 SMTP 才真发，没配就只返回预览，不报错、不丢报告。

环境变量：SMTP_HOST, SMTP_PORT（默认 587）, SMTP_USER, SMTP_PASS,
SMTP_FROM, MANAGER_EMAIL。报告正文仍以 build_daily_report 为准。
"""
import os
import smtplib
from email.message import EmailMessage


def send_daily_report(summary_text: str, day: str, lang: str = "en") -> dict:
    zh = lang == "zh"
    host, to = os.environ.get("SMTP_HOST", ""), os.environ.get("MANAGER_EMAIL", "")
    if not host or not to:
        return {"sent": False, "to": to or None,
                "reason": "未配 SMTP_HOST / MANAGER_EMAIL，只返回预览，未发送" if zh else
                          "SMTP_HOST / MANAGER_EMAIL not configured, preview only, not sent",
                "preview": summary_text}
    msg = EmailMessage()
    msg["Subject"] = f"Sidework 日报 {day}" if zh else f"Sidework Daily Report {day}"
    msg["From"] = os.environ.get("SMTP_FROM", os.environ.get("SMTP_USER", ""))
    msg["To"] = to
    msg.set_content(summary_text)
    with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587"))) as s:
        s.starttls()
        if os.environ.get("SMTP_USER"):
            s.login(os.environ["SMTP_USER"], os.environ.get("SMTP_PASS", ""))
        s.send_message(msg)
    return {"sent": True, "to": to, "reason": "", "preview": summary_text}
