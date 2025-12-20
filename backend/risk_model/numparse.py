from __future__ import annotations

def parse_money(x):
    """
    Canonical numeric parser for TR/EN formatted monetary values.

    Accepts:
      - int/float -> float
      - str with TR formatting: "3.431,68" -> 3431.68
      - str with EN formatting: "3,431.68" -> 3431.68
      - optional currency tokens: "₺", "TL"
      - parentheses negative: "(1.234,56)" -> -1234.56

    Returns:
      float or None
    """
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)

    if isinstance(x, str):
        s = x.strip()
        if not s:
            return None

        neg = False
        if s.startswith("(") and s.endswith(")"):
            neg = True
            s = s[1:-1].strip()

        # Remove common tokens / spaces
        s = s.replace("₺", "").replace("TL", "").replace("\u00a0", "").replace(" ", "")

        # Heuristic: decide decimal separator by the last seen separator
        if "," in s and "." in s:
            last_comma = s.rfind(",")
            last_dot = s.rfind(".")
            if last_comma > last_dot:
                # TR: '.' thousands, ',' decimal
                s = s.replace(".", "").replace(",", ".")
            else:
                # EN: ',' thousands, '.' decimal
                s = s.replace(",", "")
        elif "," in s:
            # If single comma and looks like decimal, convert; otherwise treat as thousands
            parts = s.split(",")
            if len(parts) == 2 and 1 <= len(parts[1]) <= 3:
                s = parts[0].replace(".", "") + "." + parts[1]
            else:
                s = s.replace(",", "")
        else:
            # Only dots: if multiple dots, keep last as decimal, others thousands
            if s.count(".") > 1:
                head, tail = s.rsplit(".", 1)
                s = head.replace(".", "") + "." + tail

        try:
            v = float(s)
            return -v if neg else v
        except Exception:
            return None

    return None
