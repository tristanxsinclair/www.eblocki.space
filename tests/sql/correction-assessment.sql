-- Run after migrations in a disposable PostgreSQL database, inside a rollback transaction.
DO $$
DECLARE
  u uuid := '11111111-1111-4111-8111-111111111111';
  p uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  c uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  contract uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
BEGIN
  IF public.cle_court(5,7,false,false) <> 'accepted_strong' OR public.cle_court(6,6,false,false) <> 'accepted_useful'
    OR public.cle_court(1,9,false,false) <> 'elite' OR public.cle_court(3,8,true,false) <> 'rejected'
    THEN RAISE EXCEPTION 'Court threshold mismatch'; END IF;
  INSERT INTO public.proof_artifacts(id,user_id,domain,title,content,quality_score,evidence_strength,assessment)
    VALUES(p,u,'psychology','Original','Original worked evidence containing enough concrete text to be assessed.',8,'strong','{"version":1}');
  INSERT INTO public.proof_commitments(id,user_id,status,proof_artifact_id) VALUES(contract,u,'completed',p);
  INSERT INTO public.proof_artifacts(id,user_id,domain,title,content,quality_score,evidence_strength,parent_artifact_id)
    VALUES(c,u,'psychology','Correction','A distinct corrected answer showing new reasons and a revised worked example.',7,'strong',p);
  BEGIN
    UPDATE public.proof_commitments SET proof_artifact_id=c WHERE id=contract;
    RAISE EXCEPTION 'test failure: task rebound';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'test failure: task rebound' THEN RAISE; END IF;
  END;
  IF (SELECT proof_artifact_id FROM public.proof_commitments WHERE id=contract) <> p THEN RAISE EXCEPTION 'Original contract changed'; END IF;
  BEGIN
    INSERT INTO public.proof_artifacts(user_id,domain,title,content,quality_score) VALUES(u,'psychology','Renamed original','Original worked evidence containing enough concrete text to be assessed.',8);
    RAISE EXCEPTION 'test failure: duplicate accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'test failure: duplicate accepted' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.proof_artifacts(user_id,domain,title,content,quality_score) VALUES(u,'psychology','New plan only',E'Original worked evidence containing enough concrete text to be assessed.\nNext upgrade: invent a new plan.',8);
    RAISE EXCEPTION 'test failure: proposed step earned new settlement';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'test failure: proposed step earned new settlement' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.proof_artifacts(user_id,domain,title,content,quality_score,parent_artifact_id) VALUES('22222222-2222-4222-8222-222222222222','psychology','Other user','Other user evidence',8,p);
    RAISE EXCEPTION 'test failure: cross-user parent accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'test failure: cross-user parent accepted' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.proof_artifacts SET quality_score=10 WHERE id=p;
    RAISE EXCEPTION 'test failure: history modified';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'test failure: history modified' THEN RAISE; END IF;
  END;
  UPDATE public.proof_artifacts SET temporal_snapshot='{}' WHERE id=p;
  IF (SELECT count(*) FROM public.xp_events WHERE proof_id IN (p,c)) <> 2 THEN RAISE EXCEPTION 'XP settlement count mismatch'; END IF;
  IF (SELECT count(*) FROM public.court_verdicts WHERE proof_id IN (p,c) AND verdict='accepted_strong') <> 2 THEN RAISE EXCEPTION 'Court disagrees with canonical strength'; END IF;
  IF (SELECT count(*) FROM public.identity_ledger WHERE proof_id IN (p,c) AND kind='escalation' AND summary LIKE '%tier %') <> 2 THEN RAISE EXCEPTION 'Duplicate identity settlement'; END IF;
  IF (SELECT total_xp FROM public.operator_level WHERE user_id=u) <> (SELECT sum(final_xp) FROM public.xp_events WHERE user_id=u) THEN RAISE EXCEPTION 'XP total differs from settlement events'; END IF;
  BEGIN
    INSERT INTO public.daily_objectives(user_id,status,proof_artifact_id,proof_required) VALUES(u,'completed',null,true);
    RAISE EXCEPTION 'test failure: objective closed without proof';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'test failure: objective closed without proof' THEN RAISE; END IF;
  END;
  INSERT INTO public.proof_artifacts(user_id,domain,title,content,quality_score,evidence_strength)
    VALUES(u,'psychology','Empty','',10,'elite');
  IF EXISTS(SELECT 1 FROM public.proof_artifacts WHERE user_id=u AND title='Empty' AND evidence_strength <> 'weak') THEN RAISE EXCEPTION 'Empty counted'; END IF;
END $$;
