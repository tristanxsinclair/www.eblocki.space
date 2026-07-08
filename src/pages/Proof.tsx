              <div>
                <Label htmlFor="proof-reflection">Reflection (optional)</Label>
                <Textarea
                  id="proof-reflection"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={3}
                  placeholder="What did this prove? What weakness did it reveal?"
                />
              </div>