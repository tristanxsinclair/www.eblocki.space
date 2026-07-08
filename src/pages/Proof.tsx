              <div>
                <Label className="mb-2 block">How strong do you think this proof is? (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {(["weak", "moderate", "strong", "elite"] as const).map((level) => (
                    <label
                      key={level}
                      className={cn(
                        "flex cursor-pointer items-center justify-center rounded-sm border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors min-h-[44px] min-w-[88px] text-center",
                        expectedStrength === level
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <input
                        type="radio"
                        name="expected-strength"
                        value={level}
                        checked={expectedStrength === level}
                        onChange={() => setExpectedStrength(level)}
                        className="sr-only"
                      />
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </label>
                  ))}
                </div>
                {expectedStrength && (
                  <button
                    type="button"
                    onClick={() => setExpectedStrength("")}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Clear
                  </button>
                )}
              </div>