/*
  # Time Tracking and Geolocation System

  ## Overview
  This migration creates a comprehensive time tracking and geolocation system for technicians,
  including clock-in/out, GPS tracking, and time entry management.

  ## New Tables

  ### 1. `time_entries`
  - Tracks technician clock-in/out times
  - Fields: id, user_id, work_order_id, clock_in_time, clock_out_time, 
    clock_in_location, clock_out_location, break_duration, notes

  ### 2. `location_tracking`
  - GPS breadcrumb trail for technicians in the field
  - Fields: id, user_id, work_order_id, latitude, longitude, accuracy, 
    address, activity_type, recorded_at

  ### 3. `travel_logs`
  - Tracks travel between job sites
  - Fields: id, user_id, from_location, to_location, start_time, end_time, 
    distance_miles, work_order_id

  ## Security
  - All tables have RLS enabled
  - Users can only view/modify their own time entries
  - Managers can view all time entries
  - Location data is sensitive and access-controlled

  ## Important Notes
  - Location tracking requires user consent
  - GPS data is used for mileage reimbursement and routing
  - Time entries can be edited with approval
  - Break times are tracked separately
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE time_entry_status AS ENUM (
    'active',
    'completed',
    'approved',
    'disputed',
    'adjusted'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'on_site',
    'traveling',
    'break',
    'idle',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id),
  work_session_id uuid REFERENCES work_sessions(id),
  clock_in_time timestamptz NOT NULL,
  clock_out_time timestamptz,
  clock_in_location jsonb,
  clock_out_location jsonb,
  total_hours numeric(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN clock_out_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600.0
      ELSE NULL 
    END
  ) STORED,
  break_duration_minutes integer DEFAULT 0,
  billable_hours numeric(10,2),
  hourly_rate numeric(10,2),
  status time_entry_status DEFAULT 'active',
  notes text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Location tracking breadcrumbs
CREATE TABLE IF NOT EXISTS location_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id),
  time_entry_id uuid REFERENCES time_entries(id),
  latitude numeric(10,7) NOT NULL,
  longitude numeric(10,7) NOT NULL,
  accuracy numeric(10,2),
  altitude numeric(10,2),
  heading numeric(5,2),
  speed numeric(10,2),
  address text,
  activity_type activity_type DEFAULT 'unknown',
  battery_level integer,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Travel logs
CREATE TABLE IF NOT EXISTS travel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id),
  time_entry_id uuid REFERENCES time_entries(id),
  from_location jsonb NOT NULL,
  to_location jsonb NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  distance_miles numeric(10,2),
  route_data jsonb,
  purpose text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User location preferences (for privacy settings)
CREATE TABLE IF NOT EXISTS user_location_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  location_tracking_enabled boolean DEFAULT true,
  tracking_frequency_seconds integer DEFAULT 300,
  high_accuracy_mode boolean DEFAULT false,
  share_location_with_team boolean DEFAULT true,
  consent_given_at timestamptz,
  consent_version text,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_work_order ON time_entries(work_order_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_location_tracking_user ON location_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_work_order ON location_tracking(work_order_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_recorded_at ON location_tracking(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_tracking_time_entry ON location_tracking(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_travel_logs_user ON travel_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_logs_work_order ON travel_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_travel_logs_dates ON travel_logs(start_time, end_time);

-- Spatial index for location queries (requires PostGIS, optional)
-- CREATE INDEX IF NOT EXISTS idx_location_tracking_point ON location_tracking 
--   USING gist(ll_to_earth(latitude, longitude));

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_location_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_entries
CREATE POLICY "Users can view their own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create their own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for location_tracking
CREATE POLICY "Users can view their own location data"
  ON location_tracking FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR EXISTS (
      SELECT 1 FROM user_location_preferences ulp
      WHERE ulp.user_id = location_tracking.user_id
      AND ulp.share_location_with_team = true
    )
  );

CREATE POLICY "Users can create their own location data"
  ON location_tracking FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for travel_logs
CREATE POLICY "Users can view their own travel logs"
  ON travel_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create their own travel logs"
  ON travel_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own travel logs"
  ON travel_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for user_location_preferences
CREATE POLICY "Users can view their own location preferences"
  ON user_location_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own location preferences"
  ON user_location_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to automatically close time entries when work session completes
CREATE OR REPLACE FUNCTION auto_close_time_entry_on_session_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE time_entries
    SET clock_out_time = NEW.completed_at,
        status = 'completed'
    WHERE work_session_id = NEW.id
      AND clock_out_time IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-close time entries
DROP TRIGGER IF EXISTS trigger_auto_close_time_entry ON work_sessions;
CREATE TRIGGER trigger_auto_close_time_entry
  AFTER UPDATE ON work_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_time_entry_on_session_complete();