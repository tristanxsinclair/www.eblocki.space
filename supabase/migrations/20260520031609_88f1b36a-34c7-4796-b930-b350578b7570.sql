
ALTER FUNCTION public.cle_canon_domain(text) SET search_path = public;
ALTER FUNCTION public.cle_level_threshold(integer) SET search_path = public;
ALTER FUNCTION public.cle_rank_for(integer) SET search_path = public;
ALTER FUNCTION public.cle_operator_title(integer) SET search_path = public;
ALTER FUNCTION public.cle_base_xp(integer) SET search_path = public;
ALTER FUNCTION public.cle_streak_mult(integer) SET search_path = public;
ALTER FUNCTION public.cle_classify_tier(text, text, boolean, boolean, integer) SET search_path = public;
ALTER FUNCTION public.cle_court(integer, integer, boolean, boolean) SET search_path = public;
ALTER FUNCTION public.cle_verdict_mult(text) SET search_path = public;

-- Restrict trigger function: SECURITY DEFINER but not directly callable by public
REVOKE EXECUTE ON FUNCTION public.cle_after_proof_insert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cle_after_proof_insert() FROM anon, authenticated;
