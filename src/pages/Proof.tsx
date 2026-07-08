              <div>
                <Label htmlFor="proof-expected-strength">How strong do you think this proof is? (optional)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["weak", "moderate", "strong", "elite"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setExpectedStrength(level)}
                      className={cn(
                        "rounded-sm border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors min-h-[44px]",
                        expectedStrength === level
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>