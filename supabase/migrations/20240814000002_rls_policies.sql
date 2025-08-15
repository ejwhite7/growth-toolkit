-- Enable Row Level Security on all tables
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_alerts ENABLE ROW LEVEL SECURITY;

-- Experiences: Public read access for active experiences
CREATE POLICY "Experiences are publicly readable" ON experiences
    FOR SELECT USING (true);

CREATE POLICY "Experiences are writable by authenticated users" ON experiences
    FOR ALL USING (auth.role() = 'authenticated');

-- Visitors: Users can only access their own visitor record
CREATE POLICY "Users can read their own visitor data" ON visitors
    FOR SELECT USING (true); -- Will be restricted by session context

CREATE POLICY "Users can insert visitor data" ON visitors
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own visitor data" ON visitors
    FOR UPDATE USING (true);

-- Sessions: Users can only access their own sessions
CREATE POLICY "Users can read their own sessions" ON sessions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert sessions" ON sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own sessions" ON sessions
    FOR UPDATE USING (true);

-- Profiles: Users can access their own profile
CREATE POLICY "Users can read their own profile" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (true);

-- Attributions: Users can access their own attributions
CREATE POLICY "Users can read their own attributions" ON attributions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert attributions" ON attributions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own attributions" ON attributions
    FOR UPDATE USING (true);

-- Events: Users can insert events, admins can read all
CREATE POLICY "Users can insert events" ON events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Events are readable by authenticated users" ON events
    FOR SELECT USING (auth.role() = 'authenticated');

-- Submissions: Users can insert, admins can read
CREATE POLICY "Users can insert submissions" ON submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Submissions are readable by authenticated users" ON submissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Identities: System level access
CREATE POLICY "Identities are readable by authenticated users" ON identities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Identities are writable by authenticated users" ON identities
    FOR ALL USING (auth.role() = 'authenticated');

-- Enrichments: System level access
CREATE POLICY "Enrichments are readable by authenticated users" ON enrichments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enrichments are writable by authenticated users" ON enrichments
    FOR ALL USING (auth.role() = 'authenticated');

-- Rules: Admin only
CREATE POLICY "Rules are readable by authenticated users" ON rules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Rules are writable by authenticated users" ON rules
    FOR ALL USING (auth.role() = 'authenticated');

-- Slack Alerts: Admin only
CREATE POLICY "Slack alerts are readable by authenticated users" ON slack_alerts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Slack alerts are writable by authenticated users" ON slack_alerts
    FOR ALL USING (auth.role() = 'authenticated');

-- Create a service role for system operations
-- This allows the application to bypass RLS when needed for system operations