            {/* Dynamic Expected vs Actual judgment feedback */}
            <div className="mt-3 rounded-sm border border-border bg-background/40 p-3 text-sm">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Your judgment
              </div>
              <div>
                You expected: <span className="font-medium">{expectedStrength ? expectedStrength.charAt(0).toUpperCase() + expectedStrength.slice(1) : "—"}</span><br />
                Actual result: <span className="font-medium">{verdict.evidenceStrength.charAt(0).toUpperCase() + verdict.evidenceStrength.slice(1)}</span>
              </div>
              <div className="mt-2 text-muted-foreground text-xs">
                This is common — many people think their proof is stronger than it scores.
              </div>

              {/* Light optional reflection prompt */}
              <div className="mt-3 pt-3 border-t border-border/60">
                <div className="text-xs text-muted-foreground mb-1">What made you expect that strength? (optional)</div>
                <Textarea
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Brief note about why you chose that level..."
                  className="text-xs min-h-[60px]"
                  rows={2}
                />
              </div>
            </div>