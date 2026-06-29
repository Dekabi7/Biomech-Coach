import json
import os
from pathlib import Path
import anthropic
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

RALLY_SYSTEM_PROMPT = """You are Rally, an expert AI tennis biomechanics coach built into the BiomechCoach app. Analyse the biomechanical metrics from the player's swing and return structured coaching feedback. Rules: never give generic advice — every point must reference the player's actual metric numbers. Keep language plain and calibrated to the player's NTRP level. Drills must be actionable with no equipment unless specified. Never invent baseline numbers — only use the USTA baseline values provided in the input. Output only valid JSON — no markdown, no preamble."""


def generate_feedback(
    metrics_comparison: dict,
    shot_type: str,
    ntrp_level: float,
) -> dict:
    metrics = metrics_comparison["metrics"]
    baseline_tier = metrics_comparison["baseline_tier"]

    # Build the metric payload in {value, baseline, unit} format per Rally spec
    metric_input = {
        key: {
            "value":    data["value"],
            "baseline": data["baseline"],
            "unit":     data["unit"],
            "status":   data["status"],
        }
        for key, data in metrics.items()
    }

    user_message = json.dumps(
        {
            "shot_type":    shot_type,
            "ntrp_level":   ntrp_level,
            "baseline_tier": baseline_tier,
            "metrics":      metric_input,
        },
        indent=2,
    )

    output_spec = """Return this exact JSON shape:
{
  "fix_this": [
    { "title": "short title", "body": "2 sentences with actual numbers vs baseline", "drills": ["drill 1", "drill 2", "drill 3"] }
  ],
  "looking_good": [
    { "title": "short title", "body": "1 sentence with actual number" }
  ],
  "pro_tip": { "title": "short title", "body": "one advanced kinetic chain insight" }
}

Rules:
- fix_this: RED status metrics only, 1–3 items, 3 drills each
- looking_good: GREEN status metrics only, 1–2 items
- pro_tip: single most impactful kinetic chain observation (any status)
- Every body field must contain the player's actual metric number
- Drills must be tennis-specific and need no equipment unless stated"""

    message = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=RALLY_SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": f"{user_message}\n\n{output_spec}"}
        ],
    )

    raw = message.content[0].text.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Strip markdown fences if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        try:
            return json.loads(raw.strip())
        except json.JSONDecodeError:
            return {"fix_this": [], "looking_good": [], "pro_tip": {}, "raw": raw}
