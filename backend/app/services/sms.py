"""短信发送：配了 Twilio 就真发，没配就返回 preview-only，不报错。"""
import os
import urllib.parse
import urllib.request

TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM = os.environ.get("TWILIO_FROM_NUMBER", "")
MANAGER_PHONE = os.environ.get("MANAGER_PHONE", "")


def send_sms(text: str, to: str = "") -> dict:
    to = to or MANAGER_PHONE
    if not (TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM and to):
        return {"sent": False, "preview": True,
                "note": "Twilio 未配置，仅预览，未发送"}
    data = urllib.parse.urlencode({"From": TWILIO_FROM, "To": to, "Body": text}).encode()
    req = urllib.request.Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json",
        data=data, method="POST")
    import base64
    req.add_header("Authorization", "Basic " + base64.b64encode(
        f"{TWILIO_SID}:{TWILIO_TOKEN}".encode()).decode())
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            import json
            return {"sent": True, "sid": json.load(resp).get("sid")}
    except Exception as e:
        return {"sent": False, "error": str(e)[:200]}
