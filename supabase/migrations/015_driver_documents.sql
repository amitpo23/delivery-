-- =============================================
-- Migration 015: Driver onboarding documents
-- =============================================
-- License, vehicle registration, insurance certificate, ID. Each driver
-- uploads through /driver/onboarding; admin reviews and flips
-- drivers.is_verified once all required docs are approved.

CREATE TABLE driver_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('license', 'vehicle_registration', 'insurance', 'id_card')),
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Only one in-flight (pending or approved) doc per type per driver.
  -- Rejected docs stay in the table for audit but don't block re-upload.
  UNIQUE(driver_id, doc_type, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_driver_documents_driver ON driver_documents(driver_id, status);

-- Private bucket — only the driver and admins can read.
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-docs', 'driver-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Drivers can upload to their own folder (path prefix = driver_id::text).
DROP POLICY IF EXISTS "Drivers upload own docs" ON storage.objects;
CREATE POLICY "Drivers upload own docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'driver-docs'
    AND EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.user_id = auth.uid()
        AND (storage.foldername(name))[1] = drivers.id::text
    )
  );

DROP POLICY IF EXISTS "Drivers read own docs" ON storage.objects;
CREATE POLICY "Drivers read own docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'driver-docs'
    AND EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.user_id = auth.uid()
        AND (storage.foldername(name))[1] = drivers.id::text
    )
  );

DROP POLICY IF EXISTS "Admins read all driver docs" ON storage.objects;
CREATE POLICY "Admins read all driver docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'driver-docs'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS on the metadata table.
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own docs metadata"
  ON driver_documents FOR ALL
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins read all driver_documents"
  ON driver_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'dispatcher')
    )
  );
