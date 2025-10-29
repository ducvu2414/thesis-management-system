-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'supervisor', 'head_of_department', 'reviewer', 'admin')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Topics table
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goals TEXT NOT NULL,
  requirements TEXT NOT NULL,
  max_students INTEGER NOT NULL,
  current_students INTEGER NOT NULL DEFAULT 0,
  supervisor_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topics_supervisor ON topics(supervisor_id);
CREATE INDEX idx_topics_status ON topics(status);

-- Topic versions (for edit history)
CREATE TABLE topic_versions (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goals TEXT NOT NULL,
  requirements TEXT NOT NULL,
  max_students INTEGER NOT NULL,
  modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topic_versions_topic ON topic_versions(topic_id);

-- Groups table
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  group_name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_groups_owner ON groups(owner_id);

-- Group members table
CREATE TABLE group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON group_members(user_id);

-- Group invitations table
CREATE TABLE group_invitations (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  inviter_id TEXT NOT NULL REFERENCES users(id),
  invitee_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_group_invitations_email ON group_invitations(invitee_email);
CREATE INDEX idx_group_invitations_group ON group_invitations(group_id);

-- Topic registrations table
CREATE TABLE topic_registrations (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id),
  topic_id TEXT NOT NULL REFERENCES topics(id),
  supervisor_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registrations_group ON topic_registrations(group_id);
CREATE INDEX idx_registrations_topic ON topic_registrations(topic_id);
CREATE INDEX idx_registrations_supervisor ON topic_registrations(supervisor_id);
CREATE INDEX idx_registrations_status ON topic_registrations(status);

-- Assignments table (reviewer/committee assignments)
CREATE TABLE assignments (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES topic_registrations(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('reviewer', 'committee')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_assignments_registration ON assignments(registration_id);
CREATE INDEX idx_assignments_reviewer ON assignments(reviewer_id);
CREATE INDEX idx_assignments_status ON assignments(status);

-- Grading criteria table
CREATE TABLE grading_criteria (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weight DOUBLE PRECISION NOT NULL,
  applicable_to TEXT[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grades table
CREATE TABLE grades (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES topic_registrations(id),
  grader_id TEXT NOT NULL REFERENCES users(id),
  criteria_id TEXT NOT NULL REFERENCES grading_criteria(id),
  score DOUBLE PRECISION NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_grades_registration ON grades(registration_id);
CREATE INDEX idx_grades_grader ON grades(grader_id);
CREATE INDEX idx_grades_criteria ON grades(criteria_id);

-- Final scores table
CREATE TABLE final_scores (
  registration_id TEXT PRIMARY KEY REFERENCES topic_registrations(id),
  computed_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  extra_points DOUBLE PRECISION NOT NULL DEFAULT 0,
  final_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extra point requests table
CREATE TABLE extra_point_requests (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  registration_id TEXT NOT NULL REFERENCES topic_registrations(id),
  reason TEXT NOT NULL,
  proof_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  points_awarded DOUBLE PRECISION,
  reviewed_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_extra_points_student ON extra_point_requests(student_id);
CREATE INDEX idx_extra_points_registration ON extra_point_requests(registration_id);
CREATE INDEX idx_extra_points_status ON extra_point_requests(status);

-- Notifications table
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

-- Audit logs table
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- System config table
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default config
INSERT INTO system_config (key, value) VALUES 
('semester', '{"current": "HK1 2024-2025"}'),
('deadlines', '{
  "registration_start": "2024-09-01T00:00:00Z",
  "registration_end": "2024-09-30T23:59:59Z",
  "submission_deadline": "2024-12-15T23:59:59Z",
  "grading_deadline": "2024-12-31T23:59:59Z"
}');
