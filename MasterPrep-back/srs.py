"""Spaced-repetition scheduling (a simplified SM-2, the algorithm behind Anki).

Each card has an `ease` (how quickly its interval grows, starting at 2.5),
an `interval` in days, and `reps` (successful reviews in a row).

    again -> forgotten: back tomorrow, ease drops, streak resets
    hard  -> remembered with effort: interval grows slowly (x1.2), ease drops a bit
    good  -> remembered: 1 day, then 3 days, then interval x ease
    easy  -> remembered easily: interval grows faster, ease rises
"""
from dataclasses import dataclass
from typing import Literal

Grade = Literal["again", "hard", "good", "easy"]
GRADES: tuple[Grade, ...] = ("again", "hard", "good", "easy")

START_EASE = 2.5
MIN_EASE = 1.3
MASTERED_DAYS = 30  # a card whose interval reaches this counts as mastered
MAX_INTERVAL = 365  # review everything at least once a year

# SM-2 grades each review 0-5; these are the buttons' places on that scale
QUALITY = {"hard": 3, "good": 4, "easy": 5}


@dataclass(frozen=True)
class CardState:
    ease: float = START_EASE
    interval: int = 0
    reps: int = 0
    lapses: int = 0


def _round(x: float) -> int:
    return int(x + 0.5)  # round half up (Python's round() rounds 2.5 down to 2)


def schedule(state: CardState, grade: Grade) -> CardState:
    if grade == "again":
        return CardState(
            ease=max(MIN_EASE, state.ease - 0.2),
            interval=1,
            reps=0,
            lapses=state.lapses + 1,
        )

    q = QUALITY[grade]
    ease = max(MIN_EASE, state.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    reps = state.reps + 1

    if reps == 1:
        base = 1
    elif reps == 2:
        base = 3
    else:
        base = state.interval * ease

    if grade == "hard":
        # Always grows a little (x1.2, at least +1 day). Basing it on ease
        # instead would stall, since every "hard" also lowers the ease.
        interval = max(state.interval + 1, _round(state.interval * 1.2)) if reps > 2 else reps
    elif grade == "easy":
        interval = _round(base * 1.5)
    else:
        interval = _round(base)

    return CardState(ease=round(ease, 2), interval=min(MAX_INTERVAL, max(1, interval)), reps=reps, lapses=state.lapses)


def previews(state: CardState) -> dict[str, int]:
    """Days until the card returns, for each possible grade."""
    return {g: schedule(state, g).interval for g in GRADES}
