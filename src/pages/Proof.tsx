              <div>
                <Label id="proof-expected-strength-label" htmlFor="proof-expected-strength">
                  How strong do you think this proof is? (optional)
                </Label>
                <div
                  role="radiogroup"
                  aria-labelledby="proof-expected-strength-label"
                  className="mt-2 flex flex-wrap gap-2"
                >
                  {(["weak", "moderate", "strong", "elite"] as const).map((level, index, arr) => {
                    const isSelected = expectedStrength === level;
                    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                        e.preventDefault();
                        const nextIndex = (index + 1) % arr.length;
                        const nextLevel = arr[nextIndex];
                        setExpectedStrength(nextLevel);
                        // Focus the next button
                        const buttons = (e.currentTarget.parentElement?.querySelectorAll('button[role="radio"]') || []) as NodeListOf<HTMLButtonElement>;
                        buttons[nextIndex]?.focus();
                      }
                      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        e.preventDefault();
                        const prevIndex = (index - 1 + arr.length) % arr.length;
                        const prevLevel = arr[prevIndex];
                        setExpectedStrength(prevLevel);
                        const buttons = (e.currentTarget.parentElement?.querySelectorAll('button[role="radio"]') || []) as NodeListOf<HTMLButtonElement>;
                        buttons[prevIndex]?.focus();
                      }
                    };

                    return (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => setExpectedStrength(level)}
                        onKeyDown={handleKeyDown}
                        className={cn(
                          "rounded-sm border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/50",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>