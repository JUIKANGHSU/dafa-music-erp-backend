import requests
from app.core.config import settings

class LineMessagingService:
    PUSH_URL = "https://api.line.me/v2/bot/message/push"

    @staticmethod
    def send_message(line_user_id: str, message: str) -> bool:
        if not line_user_id or not settings.LINE_CHANNEL_ACCESS_TOKEN:
            return False

        headers = {
            "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        body = {
            "to": line_user_id,
            "messages": [{"type": "text", "text": message}],
        }

        try:
            response = requests.post(LineMessagingService.PUSH_URL, headers=headers, json=body)
            if response.status_code == 200:
                return True
            print(f"LINE push failed: {response.text}")
            return False
        except Exception as e:
            print(f"LINE push error: {e}")
            return False
