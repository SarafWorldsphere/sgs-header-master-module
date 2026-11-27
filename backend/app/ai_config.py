import os
import time
import re
import logging
import random
from dotenv import load_dotenv
from google import genai

load_dotenv()

# ================================
# Logging
# ================================
logger = logging.getLogger("gemini_service")

if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s - %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

logger.setLevel(logging.INFO)


# ================================
# ENV Validation
# ================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")

if not GEMINI_API_KEY:
    raise Exception("❌ GEMINI_API_KEY missing")

if not GEMINI_MODEL:
    raise Exception("❌ GEMINI_MODEL missing")


# ================================
# Gemini Client
# ================================
client = genai.Client(api_key=GEMINI_API_KEY)


# ================================
# Clean AI Text
# ================================
def clean_ai_text(text: str = "") -> str:
    if not text:
        return ""

    patterns = [
        r"\$\$",
        r"\$",
        r"\\\(",
        r"\\\)",
        r"\\\{",
        r"\\\}",
        r"```json",
        r"```",
    ]

    for p in patterns:
        text = re.sub(p, "", text, flags=re.IGNORECASE)

    return text.replace("\r", "").strip()

# ================================
# Core Gemini Function
# ================================
def generate_content(prompt: str, max_retries: int = 5):
    if not prompt or not isinstance(prompt, str):
        raise ValueError("Invalid prompt")

    delay = 2

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(
                f"Gemini call | model={GEMINI_MODEL} | attempt={attempt}"
            )

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
            )

            text = getattr(response, "text", "") or ""

            usage_metadata = getattr(
                response,
                "usage_metadata",
                None,
            )

            prompt_tokens = (
                getattr(
                    usage_metadata,
                    "prompt_token_count",
                    0,
                )
                or 0
            )

            completion_tokens = (
                getattr(
                    usage_metadata,
                    "candidates_token_count",
                    0,
                )
                or 0
            )

            total_tokens = (
                getattr(
                    usage_metadata,
                    "total_token_count",
                    0,
                )
                or (prompt_tokens + completion_tokens)
            )

            return {
                "success": True,
                "text": clean_ai_text(text),
                "usage": {
                    "prompt_tokens": int(prompt_tokens),
                    "completion_tokens": int(completion_tokens),
                    "total_tokens": int(total_tokens),
                },
            }

        except Exception as err:
            status = (
                getattr(err, "status", None)
                or getattr(err, "code", None)
            )

            logger.error(
                f"Gemini error | status={status} | error={err}"
            )

            if status in [429, 500, 503] and attempt < max_retries:
                time.sleep(delay + random.uniform(0, 1))
                delay *= 2
                continue

            return {
                "success": False,
                "text": "",
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                },
                "error": str(err),
                "status": status,
            }


# ================================
# Service Wrapper
# ================================
class GeminiService:
    generate_content = staticmethod(generate_content)