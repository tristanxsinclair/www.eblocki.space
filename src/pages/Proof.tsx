              <div>
                <Label htmlFor="proof-expected-strength">How strong do you think this proof is? (optional)</Label>
                <select
                  id="proof-expected-strength"
                  value={expectedStrength}
                  onChange={(e) => setExpectedStrength(e.target.value as any)}
                  className="mt-2 w-full min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">- select -</option>
                  <option value="weak">Weak</option>
                  <option value="moderate">Moderate</option>
                  <option value="strong">Strong</option>
                  <option value="elite">Elite</option>
                </select>
              </div>