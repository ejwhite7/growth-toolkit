-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create experiences table
CREATE TABLE experiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('webinar_live', 'webinar_on_demand', 'demo', 'quiz', 'resource', 'index')),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create visitors table
CREATE TABLE visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    region TEXT NOT NULL DEFAULT 'US',
    metadata JSONB DEFAULT '{}'
);

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    company TEXT,
    title TEXT,
    phone TEXT,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(visitor_id) -- One profile per visitor
);

-- Create attributions table
CREATE TABLE attributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('first', 'last')),
    source TEXT,
    medium TEXT,
    campaign TEXT,
    term TEXT,
    content TEXT,
    referrer TEXT,
    click_ids JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(visitor_id, kind) -- One first and one last attribution per visitor
);

-- Create events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    experience_id UUID REFERENCES experiences(id) ON DELETE SET NULL,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    step TEXT,
    label TEXT,
    value NUMERIC,
    variant TEXT,
    payload JSONB DEFAULT '{}',
    consent JSONB DEFAULT '{}',
    region TEXT NOT NULL DEFAULT 'US',
    dedup_id TEXT NOT NULL UNIQUE
);

-- Create submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    payload JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create identities table
CREATE TABLE identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    resolved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create enrichments table
CREATE TABLE enrichments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rules table for Slack alerts
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    conditions JSONB NOT NULL DEFAULT '{}',
    channel TEXT NOT NULL,
    template TEXT NOT NULL,
    throttle_window_seconds INTEGER DEFAULT 300,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create slack_alerts table
CREATE TABLE slack_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    throttled BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX idx_experiences_type ON experiences(type);
CREATE INDEX idx_experiences_slug ON experiences(slug);
CREATE INDEX idx_experiences_tags ON experiences USING GIN(tags);
CREATE INDEX idx_experiences_created_at ON experiences(created_at);

CREATE INDEX idx_visitors_first_seen ON visitors(first_seen_at);
CREATE INDEX idx_visitors_last_seen ON visitors(last_seen_at);

CREATE INDEX idx_sessions_visitor_id ON sessions(visitor_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);
CREATE INDEX idx_sessions_region ON sessions(region);

CREATE INDEX idx_profiles_visitor_id ON profiles(visitor_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_company ON profiles(company);

CREATE INDEX idx_attributions_visitor_id ON attributions(visitor_id);
CREATE INDEX idx_attributions_kind ON attributions(kind);
CREATE INDEX idx_attributions_source ON attributions(source);

CREATE INDEX idx_events_occurred_at ON events(occurred_at);
CREATE INDEX idx_events_visitor_id ON events(visitor_id);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_experience_id ON events(experience_id);
CREATE INDEX idx_events_action ON events(action);
CREATE INDEX idx_events_dedup_id ON events(dedup_id);
CREATE INDEX idx_events_payload ON events USING GIN(payload);

CREATE INDEX idx_submissions_experience_id ON submissions(experience_id);
CREATE INDEX idx_submissions_profile_id ON submissions(profile_id);
CREATE INDEX idx_submissions_occurred_at ON submissions(occurred_at);

CREATE INDEX idx_identities_visitor_id ON identities(visitor_id);
CREATE INDEX idx_identities_provider ON identities(provider);
CREATE INDEX idx_identities_confidence ON identities(confidence);

CREATE INDEX idx_enrichments_profile_id ON enrichments(profile_id);
CREATE INDEX idx_enrichments_provider ON enrichments(provider);

CREATE INDEX idx_rules_active ON rules(active);

CREATE INDEX idx_slack_alerts_rule_id ON slack_alerts(rule_id);
CREATE INDEX idx_slack_alerts_event_id ON slack_alerts(event_id);
CREATE INDEX idx_slack_alerts_sent_at ON slack_alerts(sent_at);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_experiences_updated_at
    BEFORE UPDATE ON experiences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at
    BEFORE UPDATE ON rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update visitors.last_seen_at when sessions are created/updated
CREATE OR REPLACE FUNCTION update_visitor_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE visitors 
    SET last_seen_at = COALESCE(NEW.started_at, NOW())
    WHERE id = NEW.visitor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visitor_last_seen_trigger
    AFTER INSERT OR UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_visitor_last_seen();