-- Additive history; old artifacts remain readable. Safe to replay.
ALTER TABLE public.proof_artifacts ADD COLUMN IF NOT EXISTS parent_artifact_id uuid REFERENCES public.proof_artifacts(id) ON DELETE SET NULL;
ALTER TABLE public.proof_artifacts ADD COLUMN IF NOT EXISTS assessment jsonb;
CREATE INDEX IF NOT EXISTS proof_artifacts_parent_idx ON public.proof_artifacts(parent_artifact_id) WHERE parent_artifact_id IS NOT NULL;

-- Evidence identity excludes the student's proposed future work, matching
-- evidenceOnly in the scorer. A renamed plan is not a new settled artifact.
CREATE OR REPLACE FUNCTION public.proof_evidence_fingerprint(content text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT md5(regexp_replace(lower(trim(regexp_replace(coalesce(content,''),
    '(^|\n)\s*(#{1,6}\s*)?(next upgrade|next step|future upgrade|proposed upgrade)\s*:.*$', '', 'is'))), '\s+', ' ', 'g'))
$$;

-- This guard runs before the existing CLE trigger. Serialise each user's filings
-- so concurrent submissions cannot earn settlement twice for identical evidence.
CREATE OR REPLACE FUNCTION public.guard_proof_assessment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));
  IF NEW.parent_artifact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.proof_artifacts p WHERE p.id = NEW.parent_artifact_id AND p.user_id = NEW.user_id
  ) THEN RAISE EXCEPTION 'Original proof is unavailable or belongs to another user'; END IF;
  IF EXISTS (SELECT 1 FROM public.proof_artifacts p WHERE p.user_id = NEW.user_id
    AND public.proof_evidence_fingerprint(p.content) = public.proof_evidence_fingerprint(NEW.content)
    AND p.created_at > now() - interval '7 days') THEN
    RAISE EXCEPTION 'Unchanged evidence: the original gap is unresolved. Submit a worked correction, not a new title.';
  END IF;
  NEW.content_hash := public.proof_evidence_fingerprint(NEW.content);
  NEW.quality_score := greatest(1, least(10, coalesce(NEW.quality_score, 1)));
  IF length(trim(coalesce(NEW.content,''))) < 40 THEN NEW.quality_score := least(3, NEW.quality_score); END IF;
  NEW.evidence_strength := CASE WHEN NEW.quality_score >= 9 THEN 'elite' WHEN NEW.quality_score >= 7 THEN 'strong' WHEN NEW.quality_score >= 4 THEN 'moderate' ELSE 'weak' END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_proof_assessment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS a_guard_proof_assessment ON public.proof_artifacts;
CREATE TRIGGER a_guard_proof_assessment BEFORE INSERT ON public.proof_artifacts FOR EACH ROW EXECUTE FUNCTION public.guard_proof_assessment();

-- Court is a settlement projection of the ten-point assessment, not a second
-- classifier. Flags/tier still determine XP magnitude, never evidence strength.
CREATE OR REPLACE FUNCTION public.cle_court(tier integer, quality integer, is_duplicate boolean, vague boolean)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN is_duplicate OR vague OR quality IS NULL OR quality <= 3 THEN 'rejected'
    WHEN quality <= 6 THEN 'accepted_useful'
    WHEN quality <= 8 THEN 'accepted_strong' ELSE 'elite' END
$$;

CREATE OR REPLACE FUNCTION public.guard_proof_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.proof_artifact_id IS NOT NULL AND NEW.proof_artifact_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.proof_artifacts WHERE id=OLD.proof_artifact_id) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.proof_artifact_id IS NOT NULL AND NEW.proof_artifact_id IS DISTINCT FROM OLD.proof_artifact_id THEN
    RAISE EXCEPTION 'A settled task cannot be bound to a second proof';
  END IF;
  -- Do not retroactively invalidate a previously settled historical task when
  -- an unrelated field is edited.
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.proof_artifact_id IS NOT DISTINCT FROM OLD.proof_artifact_id THEN RETURN NEW; END IF;
  IF NEW.status = 'completed' AND NEW.proof_artifact_id IS NULL THEN
    IF TG_TABLE_NAME = 'proof_commitments' THEN RAISE EXCEPTION 'A proof artifact is required to close this contract'; END IF;
    IF TG_TABLE_NAME = 'daily_objectives' THEN
      IF NEW.proof_required THEN RAISE EXCEPTION 'A proof artifact is required to close this objective'; END IF;
    END IF;
  END IF;
  IF NEW.status = 'completed' AND NEW.proof_artifact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.proof_artifacts p WHERE p.id = NEW.proof_artifact_id AND p.user_id = NEW.user_id
      AND p.quality_score >= 7 AND p.evidence_strength IN ('strong','elite')
  ) THEN RAISE EXCEPTION 'Counted evidence owned by this user is required to close this task'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_proof_completion() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_counted_contract ON public.proof_commitments;
CREATE TRIGGER guard_counted_contract BEFORE INSERT OR UPDATE ON public.proof_commitments FOR EACH ROW EXECUTE FUNCTION public.guard_proof_completion();
DROP TRIGGER IF EXISTS guard_counted_objective ON public.daily_objectives;
CREATE TRIGGER guard_counted_objective BEFORE INSERT OR UPDATE ON public.daily_objectives FOR EACH ROW EXECUTE FUNCTION public.guard_proof_completion();
-- Existing own-row RLS is unchanged. No backfill/rejudgment of historical XP.

-- Freeze assessed evidence and lineage after filing; feedback votes and temporal
-- snapshots can still be updated using the existing interfaces.
CREATE OR REPLACE FUNCTION public.guard_assessed_history()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.assessment IS NOT NULL AND (
    NEW.assessment IS DISTINCT FROM OLD.assessment OR (NEW.parent_artifact_id IS DISTINCT FROM OLD.parent_artifact_id
      AND (NEW.parent_artifact_id IS NOT NULL OR EXISTS (SELECT 1 FROM public.proof_artifacts WHERE id=OLD.parent_artifact_id)))
    OR NEW.content IS DISTINCT FROM OLD.content OR NEW.domain IS DISTINCT FROM OLD.domain
    OR NEW.quality_score IS DISTINCT FROM OLD.quality_score OR NEW.evidence_strength IS DISTINCT FROM OLD.evidence_strength
  ) THEN RAISE EXCEPTION 'Assessed history is immutable; submit a corrected attempt'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_assessed_history() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_assessed_history ON public.proof_artifacts;
CREATE TRIGGER guard_assessed_history BEFORE UPDATE ON public.proof_artifacts FOR EACH ROW EXECUTE FUNCTION public.guard_assessed_history();
