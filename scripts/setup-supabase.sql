-- Storage bucket policies

-- Academy access model. This migration is additive and keeps the legacy
-- users/orders/courses/lessons tables available during the transition.
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch TEXT NOT NULL CHECK (branch IN ('cot_song', 'yoga')),
  code TEXT UNIQUE NOT NULL CHECK (code IN ('A1', 'A2', 'A3', 'B1', 'B2', 'B3')),
  name TEXT NOT NULL,
  description TEXT,
  price_min BIGINT,
  price_max BIGINT,
  price_founder BIGINT,
  content_access_months INTEGER NOT NULL CHECK (content_access_months > 0),
  support_days INTEGER,
  requires_screening BOOLEAN NOT NULL DEFAULT false,
  includes_certification BOOLEAN NOT NULL DEFAULT false,
  legal_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (legal_review_status IN ('not_required', 'pending', 'reviewed')),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  package_id UUID NOT NULL REFERENCES packages(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'active', 'content_expired', 'cancelled')),
  amount BIGINT NOT NULL CHECK (amount >= 0),
  payment_reference TEXT UNIQUE,
  activated_at TIMESTAMPTZ,
  content_access_expires_at TIMESTAMPTZ,
  support_expires_at TIMESTAMPTZ,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  package_id UUID NOT NULL REFERENCES packages(id),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_content_access (
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, course_id)
);

ALTER TABLE packages ADD COLUMN IF NOT EXISTS legal_review_status TEXT DEFAULT 'pending';
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_legal_review_status_check;
ALTER TABLE packages ADD CONSTRAINT packages_legal_review_status_check
  CHECK (legal_review_status IN ('not_required', 'pending', 'reviewed'));

ALTER TABLE applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'waitlist', 'waitlist_pre_review'));

INSERT INTO packages
  (branch, code, name, price_min, price_max, price_founder,
   content_access_months, support_days, requires_screening,
   includes_certification, legal_review_status)
VALUES
  ('cot_song', 'A1', 'Tác động cột sống Nền tảng', 3490000, 4900000, 3490000, 12, 60, true, false, 'pending'),
  ('cot_song', 'A2', 'Tác động cột sống Hybrid', 8900000, 13900000, 8900000, 18, 90, true, false, 'pending'),
  ('cot_song', 'A3', 'Tác động cột sống Chuyên sâu', 17900000, 27900000, 17900000, 24, 365, true, true, 'pending'),
  ('yoga', 'B1', 'Yoga Cân bằng', 790000, 2490000, 790000, 6, 30, false, false, 'not_required'),
  ('yoga', 'B2', 'Yoga Dẻo dai & Dáng đẹp', 2490000, 5900000, 2490000, 9, 60, false, false, 'not_required'),
  ('yoga', 'B3', 'Đào tạo giáo viên Yoga', 14900000, 34900000, 14900000, 24, 365, true, true, 'not_required')
ON CONFLICT (code) DO UPDATE SET
  content_access_months = EXCLUDED.content_access_months,
  support_days = EXCLUDED.support_days,
  requires_screening = EXCLUDED.requires_screening,
  includes_certification = EXCLUDED.includes_certification;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  provider TEXT NOT NULL DEFAULT 'casso',
  provider_transaction_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  description TEXT NOT NULL,
  sender_name TEXT,
  transaction_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSED',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_transactions_provider_txn_unique UNIQUE (provider, provider_transaction_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_user_active_idx
  ON subscriptions (user_id, status, content_access_expires_at);

CREATE OR REPLACE FUNCTION academy_can_access_course(requested_user_id UUID, requested_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions s
    JOIN package_content_access pca ON pca.package_id = s.package_id
    JOIN packages p ON p.id = s.package_id
    WHERE s.user_id = requested_user_id
      AND pca.course_id = requested_course_id
      AND s.status = 'active'
      AND s.activated_at IS NOT NULL
      AND s.content_access_expires_at > NOW()
      AND p.is_active
      AND p.legal_review_status IN ('not_required', 'reviewed')
  );
$$;

CREATE OR REPLACE FUNCTION confirm_package_legal_review(
  requested_package_id UUID,
  confirmation TEXT
)
RETURNS packages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_package packages;
BEGIN
  IF confirmation <> 'Tôi xác nhận đã hoàn tất rà soát pháp lý cho chương trình này' THEN
    RAISE EXCEPTION 'Legal review confirmation text does not match';
  END IF;

  UPDATE packages
  SET legal_review_status = 'reviewed'
  WHERE id = requested_package_id
    AND legal_review_status = 'pending'
  RETURNING * INTO updated_package;

  IF updated_package.id IS NULL THEN
    RAISE EXCEPTION 'Package is not pending legal review or does not exist';
  END IF;

  RETURN updated_package;
END;
$$;

REVOKE EXECUTE ON FUNCTION confirm_package_legal_review(UUID, TEXT)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION confirm_package_legal_review(UUID, TEXT)
  TO service_role;

ALTER TABLE package_content_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active_users_read_entitled_content" ON package_content_access;
CREATE POLICY "active_users_read_entitled_content" ON package_content_access
  FOR SELECT USING (academy_can_access_course(auth.uid(), course_id));

DROP POLICY IF EXISTS "users_read_own_subscriptions" ON subscriptions;
CREATE POLICY "users_read_own_subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON COLUMN packages.legal_review_status IS
  'pending locks sales; reviewed requires explicit legal confirmation before opening';
COMMENT ON COLUMN subscriptions.content_access_expires_at IS
  'Content access only; certifications and competency records remain permanent';

-- Users can only read their own lesson progress
CREATE POLICY "users_own_progress" ON lesson_progress
  FOR ALL USING (auth.uid()::text = user_id);

-- Users can only read their own orders
CREATE POLICY "users_own_orders" ON orders
  FOR SELECT USING (auth.uid()::text = user_id);

-- Users can view their own submissions
CREATE POLICY "users_own_submissions" ON user_submissions
  FOR ALL USING (auth.uid()::text = user_id);

-- Admin can access everything
CREATE POLICY "admin_all_access" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN')
  );

-- Supabase Storage: course-videos and course-documents buckets are strictly PRIVATE.
-- Client access requires server-verified entitlement and short-lived signed URLs.
-- Only Admin can manage files directly in storage.
DROP POLICY IF EXISTS "authenticated_read_videos" ON storage.objects;
CREATE POLICY "admin_manage_videos" ON storage.objects
  FOR ALL
  USING (bucket_id = 'course-videos' AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'));

DROP POLICY IF EXISTS "authenticated_read_documents" ON storage.objects;
CREATE POLICY "admin_manage_documents" ON storage.objects
  FOR ALL
  USING (bucket_id = 'course-documents' AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'));

-- User submissions storage policy
CREATE POLICY "users_manage_own_submissions" ON storage.objects
  FOR ALL
  USING (bucket_id = 'user-submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin exports storage policy
CREATE POLICY "admin_manage_exports" ON storage.objects
  FOR ALL
  USING (bucket_id = 'admin-exports' AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'));

-- Certificates storage policy
CREATE POLICY "users_own_certificates" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "admin_manage_certificates" ON storage.objects
  FOR ALL
  USING (bucket_id = 'certificates' AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'));
