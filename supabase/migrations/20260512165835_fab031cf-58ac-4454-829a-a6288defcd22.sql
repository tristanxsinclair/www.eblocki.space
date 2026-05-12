
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles select own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Daily control sheets
CREATE TABLE public.daily_control_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sheet_date DATE NOT NULL DEFAULT CURRENT_DATE,
  prime_objective TEXT,
  law_proof TEXT,
  psychology_proof TEXT,
  eblocki_proof TEXT,
  friction_task TEXT,
  avoidance_signal TEXT,
  next_best_action TEXT,
  end_output TEXT,
  end_proof TEXT,
  end_avoidance TEXT,
  end_pattern TEXT,
  tomorrow_first_move TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sheet_date)
);
ALTER TABLE public.daily_control_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dcs all own" ON public.daily_control_sheets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Proof artifacts
CREATE TABLE public.proof_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  title TEXT NOT NULL,
  artifact_type TEXT,
  content TEXT,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
  evidence_strength TEXT CHECK (evidence_strength IN ('weak','moderate','strong','elite')),
  feedback TEXT,
  next_upgrade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.proof_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa all own" ON public.proof_artifacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Proof commitments
CREATE TABLE public.proof_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coach_interaction_id UUID,
  daily_control_sheet_id UUID REFERENCES public.daily_control_sheets(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  mode TEXT,
  title TEXT NOT NULL,
  required_artifact TEXT,
  evidence_standard TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','completed','cancelled','missed')),
  proof_artifact_id UUID REFERENCES public.proof_artifacts(id) ON DELETE SET NULL,
  completion_reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.proof_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc all own" ON public.proof_commitments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Coach interactions
CREATE TABLE public.coach_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode TEXT,
  user_input TEXT NOT NULL,
  assistant_output TEXT,
  state_detected TEXT,
  proof_required BOOLEAN DEFAULT false,
  proof_contract_id UUID REFERENCES public.proof_commitments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coach_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ci all own" ON public.coach_interactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Config
CREATE TABLE public.performance_os_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  model TEXT DEFAULT 'google/gemini-3-flash-preview',
  vector_store_id TEXT,
  default_response_structure BOOLEAN DEFAULT true,
  strict_verification BOOLEAN DEFAULT true,
  auto_create_proof_contracts BOOLEAN DEFAULT true,
  proof_contract_minimum_seriousness INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_os_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config all own" ON public.performance_os_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_dcs_updated BEFORE UPDATE ON public.daily_control_sheets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON public.performance_os_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  INSERT INTO public.performance_os_config (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
