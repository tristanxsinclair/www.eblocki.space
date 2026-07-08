            {/* Judgment + Calibration feedback */}
            <div className="mt-3 rounded-sm border border-border bg-background/40 p-3 text-sm">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Your judgment
              </div>
              <div>
                You expected: <span className="font-medium">{expectedStrength ? expectedStrength.charAt(0).toUpperCase() + expectedStrength.slice(1) : "—"}</span><br />
                Actual result: <span className="font-medium">{verdict.evidenceStrength.charAt(0).toUpperCase() + verdict.evidenceStrength.slice(1)}</span>
              </div>

              {calibrationResult && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {calibrationResult === "accurate" && "Accurate calibration. Your estimate matched the accepted evidence."}
                  {calibrationResult === "overestimated" && "Calibration gap detected. Your estimate was higher than the accepted evidence."}
                  {calibrationResult === "underestimated" && "Calibration gap detected. Your estimate was lower than the accepted evidence."}
                </div>
              )}
            </div>