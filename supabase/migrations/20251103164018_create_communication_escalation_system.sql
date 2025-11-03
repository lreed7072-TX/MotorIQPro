/*
  # Communication & Escalation System

  ## Overview
  This migration creates a comprehensive communication and escalation system with in-app messaging,
  notifications, and automated escalation logic for delayed or high-priority jobs.

  ## New Tables

  ### 1. `messages`
  - In-app messaging between users (dispatch, techs, managers)
  - Fields: id, conversation_id, sender_id, recipient_id, subject, content, 
    read_at, parent_message_id

  ### 2. `conversations`
  - Groups messages into conversations/threads
  - Fields: id, title, participants, work_order_id, last_message_at

  ### 3. `notifications`
  - System notifications for users
  - Fields: id, user_id, type, title, message, related_type, related_id, 
    read_at, action_url

  ### 4. `escalations`
  - Tracks escalated issues and their resolution
  - Fields: id, work_order_id, escalation_type, severity, reason, 
    escalated_by, escalated_to, resolved_at, resolution_notes

  ### 5. `escalation_rules`
  - Configurable rules for automatic escalations
  - Fields: id, rule_name, condition_type, threshold_value, escalation_action, 
    notify_roles, is_active

  ## Security
  - All tables have RLS enabled
  - Users can only view their own messages and notifications
  - Escalations visible to involved parties and management

  ## Important Notes
  - Notifications are created automatically by system events
  - Escalation rules run on schedule to check conditions
  - Messages support threading for organized conversations
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'work_order_assigned',
    'work_order_updated',
    'work_order_completed',
    'message_received',
    'approval_requested',
    'approval_completed',
    'parts_low_stock',
    'quote_accepted',
    'contract_expiring',
    'maintenance_due',
    'escalation_created',
    'system_alert'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE escalation_type AS ENUM (
    'delayed_work_order',
    'high_priority_overdue',
    'customer_complaint',
    'quality_issue',
    'safety_concern',
    'parts_delay',
    'technician_unavailable',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE escalation_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE escalation_status AS ENUM (
    'open',
    'acknowledged',
    'in_progress',
    'resolved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  work_order_id uuid REFERENCES work_orders(id),
  participants uuid[] NOT NULL,
  created_by uuid REFERENCES users(id),
  last_message_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id),
  subject text,
  content text NOT NULL,
  parent_message_id uuid REFERENCES messages(id),
  attachments jsonb,
  read_by uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_type text,
  related_id uuid,
  action_url text,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Escalations table
CREATE TABLE IF NOT EXISTS escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid REFERENCES work_orders(id),
  escalation_type escalation_type NOT NULL,
  severity escalation_severity NOT NULL,
  status escalation_status DEFAULT 'open',
  reason text NOT NULL,
  description text,
  escalated_by uuid REFERENCES users(id),
  escalated_to uuid REFERENCES users(id),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Escalation rules (for automated escalations)
CREATE TABLE IF NOT EXISTS escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  description text,
  condition_type text NOT NULL,
  threshold_value integer,
  threshold_unit text,
  escalation_type escalation_type NOT NULL,
  severity escalation_severity NOT NULL,
  escalation_action text,
  notify_roles user_role[],
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING gin(participants);
CREATE INDEX IF NOT EXISTS idx_conversations_work_order ON conversations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_escalations_work_order ON escalations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_severity ON escalations(severity);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they're part of"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(participants)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND auth.uid() = ANY(participants)
  );

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(participants)
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        auth.uid() = ANY(conversations.participants)
        OR EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY(conversations.participants)
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications for users"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for escalations
CREATE POLICY "Users can view escalations they're involved in"
  ON escalations FOR SELECT
  TO authenticated
  USING (
    escalated_by = auth.uid()
    OR escalated_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM work_orders
      WHERE work_orders.id = escalations.work_order_id
      AND work_orders.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create escalations"
  ON escalations FOR INSERT
  TO authenticated
  WITH CHECK (escalated_by = auth.uid());

CREATE POLICY "Assigned users and managers can update escalations"
  ON escalations FOR UPDATE
  TO authenticated
  USING (
    escalated_to = auth.uid()
    OR escalated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- RLS Policies for escalation_rules
CREATE POLICY "All authenticated users can view escalation rules"
  ON escalation_rules FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins and managers can manage escalation rules"
  ON escalation_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();