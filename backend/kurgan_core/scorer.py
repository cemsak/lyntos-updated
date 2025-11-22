# Placeholder scoring utils
def normalize(value: float, min_v: float = 0.0, max_v: float = 100.0) -> float:
    if max_v == min_v:
        return 0.0
    return (value - min_v) / (max_v - min_v)
