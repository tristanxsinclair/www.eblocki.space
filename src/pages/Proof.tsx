  const [expectedStrength, setExpectedStrength] = useState<"weak" | "moderate" | "strong" | "elite" | "">("");

  function getCalibrationResult(expected: string, actual: string): "underestimated" | "accurate" | "overestimated" | null {
    if (!expected || !actual) return null;
    const order = ["weak", "moderate", "strong", "elite"];
    const expIdx = order.indexOf(expected);
    const actIdx = order.indexOf(actual);
    if (expIdx < actIdx) return "underestimated";
    if (expIdx === actIdx) return "accurate";
    return "overestimated";
  }

  const calibrationResult = verdict ? getCalibrationResult(expectedStrength, verdict.evidenceStrength) : null;