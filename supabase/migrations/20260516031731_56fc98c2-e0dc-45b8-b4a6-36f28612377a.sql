
ALTER TABLE public.proof_artifacts
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size integer;

INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-attachments', 'proof-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view own proof attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'proof-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own proof attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proof-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own proof attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'proof-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own proof attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'proof-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
