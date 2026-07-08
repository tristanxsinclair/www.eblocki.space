        {verdict && (
          <MotionLockIn active={!!verdict} className="panel p-4 md:p-5 border-primary/40 max-w-full overflow-hidden" id="feedback">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Proof saved.</span>
              </div>
              <EvidenceStrengthBadge strength={verdict.evidenceStrength} score={verdict.qualityScore} />
            </div>

            {/* Simple Expected vs Actual judgment feedback */}
            <div className="mt-3 rounded-sm border border-border bg-background/40 p-3 text-sm">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Your judgment
              </div>
              <div>
                You expected: <span className="font-medium">Strong</span><br />
                Actual result: <span className="font-medium">Moderate</span>
              </div>
              <div className="mt-2 text-muted-foreground text-xs">
                This is common — many people think their proof is stronger than it scores.
              </div>
            </div>

            <div className="mt-3 grid gap-3 text-sm">
              <VerdictRow label="Count status" value={countStatus(verdict)} />
              <VerdictRow label="Today status" value={todayStatus(verdict)} />
              <VerdictRow label="One next command" value={verdict.nextUpgrade} />
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              {shouldImproveProof(verdict) ? (
                <Button size="sm" className="w-full sm:w-auto min-h-[44px] native-tap" onClick={() => { setVerdict(null); setSubmittedStudyClassification(null); setDetailOpen(false); }}>
                  Improve proof
                </Button>
              ) : (
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button
                    size="sm"
                    className="w-full sm:w-auto min-h-[44px] native-tap"
                    onClick={() => {
                      void logEvent(firstProofMode ? "activation_verdict_cta_clicked" : "proof_verdict_cta_clicked", {
                        route: "/proof",
                        source: firstProofMode ? "first_proof" : "proof",
                        ctaName: "back_to_today",
                        destination: "/dashboard",
                      });
                    }}
                  >
                    {firstProofMode ? "See my next step" : "Back to Today"}
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto min-h-[44px] native-tap"
                onClick={() => { setVerdict(null); setSubmittedStudyClassification(null); setDetailOpen(false); }}
              >
                Submit another proof
              </Button>
            </div>
          </MotionLockIn>
        )}