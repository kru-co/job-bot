-- Job Bot Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  website TEXT,
  target_priority TEXT CHECK (target_priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  application_count INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  location TEXT,
  remote BOOLEAN DEFAULT FALSE,
  url TEXT NOT NULL UNIQUE,
  description TEXT,
  requirements TEXT,
  salary_min INT,
  salary_max INT,
  source TEXT, -- 'rss', 'adzuna', 'manual', 'greenhouse', 'lever'
  match_quality TEXT CHECK (match_quality IN ('perfect', 'wider_net', 'no_match')),
  match_confidence INT CHECK (match_confidence >= 0 AND match_confidence <= 100),
  match_reasoning TEXT,
  status TEXT CHECK (status IN ('discovered', 'queued', 'applied', 'skipped')) DEFAULT 'discovered',
  fingerprint TEXT UNIQUE, -- For duplicate detection
  discovered_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posted_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on fingerprint for fast duplicate detection
CREATE INDEX idx_jobs_fingerprint ON jobs(fingerprint);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_match_quality ON jobs(match_quality);

-- Cover Letters table
CREATE TABLE cover_letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  template_used TEXT,
  customization_notes JSONB,
  file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id),
  cover_letter_id UUID REFERENCES cover_letters(id),
  status TEXT CHECK (status IN ('pending', 'processing', 'submitted', 'failed', 'manual_review')) DEFAULT 'pending',
  application_type TEXT CHECK (application_type IN ('automated', 'ad_hoc', 'manual')) DEFAULT 'automated',
  application_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submission_method TEXT, -- 'playwright', 'greenhouse_api', 'lever_api', 'manual'
  confirmation_code TEXT,
  failure_reason TEXT,
  error_details TEXT,
  retry_count INT DEFAULT 0,
  screenshot_path TEXT,
  additional_questions JSONB, -- Unknown questions that need manual answers
  user_rating INT CHECK (user_rating >= 1 AND user_rating <= 5),
  user_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standard Answers table
CREATE TABLE standard_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_pattern TEXT NOT NULL UNIQUE,
  answer TEXT NOT NULL,
  answer_type TEXT, -- 'text', 'number', 'boolean', 'select'
  category TEXT, -- 'personal', 'authorization', 'compensation', 'custom'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot Settings table
CREATE TABLE bot_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Usage Logs (for cost tracking)
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id),
  application_id UUID REFERENCES applications(id),
  operation TEXT NOT NULL, -- 'job_scoring', 'cover_letter_generation', etc.
  model TEXT NOT NULL,
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  cost DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_created_at ON ai_usage_logs(created_at);

-- Weekly Application Tracking
CREATE TABLE weekly_application_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  week_start DATE NOT NULL,
  application_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, week_start)
);

-- Insert default bot settings
INSERT INTO bot_settings (setting_key, setting_value, description) VALUES
  ('daily_quota', '{"total": 8, "perfect_match": 3, "wider_net": 5}'::jsonb, 'Daily application quotas'),
  ('company_weekly_limit', '{"limit": 2}'::jsonb, 'Max applications per company per week'),
  ('bot_enabled', '{"enabled": true}'::jsonb, 'Whether bot is actively applying'),
  ('match_quality_weights', '{"title": 0.4, "salary": 0.3, "location": 0.2, "industry": 0.1}'::jsonb, 'Weights for match quality scoring');

-- Insert standard answers
INSERT INTO standard_answers (question_pattern, answer, answer_type, category) VALUES
  ('veteran|military service', 'No', 'select', 'personal'),
  ('disability|disabled', 'No', 'select', 'personal'),
  ('race|ethnicity', 'White', 'select', 'personal'),
  ('gender', 'Male', 'select', 'personal'),
  ('pronoun', 'he/him', 'text', 'personal'),
  ('authorization|authorized to work', 'Yes', 'select', 'authorization'),
  ('sponsorship|visa', 'No', 'select', 'authorization'),
  ('relocate|relocation', 'No', 'select', 'authorization'),
  ('years.*experience', '7-10', 'text', 'personal'),
  ('salary|compensation|expected pay', '165000', 'number', 'compensation'),
  ('phone|mobile|cell', '2066992229', 'text', 'personal'),
  ('email|e-mail', 'joshua.kruger@outlook.com', 'text', 'personal');

-- Insert target companies
INSERT INTO companies (name, website, target_priority, notes) VALUES
  ('Amazon', 'https://amazon.jobs', 'high', 'Priority: AWS, Alexa, IoT products'),
  ('Microsoft', 'https://careers.microsoft.com', 'high', 'Priority: Azure, Hardware'),
  ('Google', 'https://careers.google.com', 'high', 'Priority: Cloud, Hardware, Nest'),
  ('Apple', 'https://jobs.apple.com', 'high', 'Priority: Hardware, HomeKit'),
  ('Meta', 'https://metacareers.com', 'high', 'Priority: VR/AR, Hardware'),
  ('Tesla', 'https://tesla.com/careers', 'medium', 'Priority: Energy, Software'),
  ('Rivian', 'https://rivian.com/careers', 'medium', 'Priority: Software Platform'),
  ('SpaceX', 'https://spacex.com/careers', 'medium', 'Priority: Software Systems'),
  ('Stripe', 'https://stripe.com/jobs', 'medium', 'Priority: Platform Products'),
  ('Shopify', 'https://shopify.com/careers', 'medium', 'Priority: Platform, Commerce');

-- Create view for application stats
CREATE VIEW application_stats AS
SELECT
  DATE(application_date) as date,
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE status = 'submitted') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'manual_review') as needs_review,
  AVG(user_rating) FILTER (WHERE user_rating IS NOT NULL) as avg_rating
FROM applications
GROUP BY DATE(application_date)
ORDER BY date DESC;

-- Create function to update company application count
CREATE OR REPLACE FUNCTION update_company_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted' THEN
    UPDATE companies
    SET application_count = application_count + 1
    WHERE id = (SELECT company_id FROM jobs WHERE id = NEW.job_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for company application count
CREATE TRIGGER update_company_count_trigger
AFTER INSERT OR UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION update_company_application_count();

-- Create function to track weekly applications per company
CREATE OR REPLACE FUNCTION track_weekly_applications()
RETURNS TRIGGER AS $$
DECLARE
  company_uuid UUID;
  week_start_date DATE;
BEGIN
  IF NEW.status = 'submitted' THEN
    -- Get company_id from job
    SELECT company_id INTO company_uuid FROM jobs WHERE id = NEW.job_id;

    -- Calculate week start (Monday)
    week_start_date := DATE_TRUNC('week', NEW.application_date)::DATE;

    -- Insert or update weekly tracking
    INSERT INTO weekly_application_tracking (company_id, week_start, application_count)
    VALUES (company_uuid, week_start_date, 1)
    ON CONFLICT (company_id, week_start)
    DO UPDATE SET application_count = weekly_application_tracking.application_count + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for weekly tracking
CREATE TRIGGER track_weekly_trigger
AFTER INSERT OR UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION track_weekly_applications();

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_application_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users - single user system)
CREATE POLICY "Allow all for authenticated users" ON companies FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON jobs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON cover_letters FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON applications FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON standard_answers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON bot_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON ai_usage_logs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON weekly_application_tracking FOR ALL TO authenticated USING (true);

-- Allow service role to bypass RLS
CREATE POLICY "Allow service role full access" ON companies FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON jobs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON cover_letters FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON applications FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON standard_answers FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON bot_settings FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON ai_usage_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Allow service role full access" ON weekly_application_tracking FOR ALL TO service_role USING (true);

-- Create indexes for performance
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_date ON applications(application_date);
CREATE INDEX idx_cover_letters_job_id ON cover_letters(job_id);
CREATE INDEX idx_companies_target_priority ON companies(target_priority);
CREATE INDEX idx_weekly_tracking_company ON weekly_application_tracking(company_id, week_start);

COMMENT ON TABLE jobs IS 'All discovered and tracked job postings';
COMMENT ON TABLE applications IS 'Application submission tracking and status';
COMMENT ON TABLE cover_letters IS 'AI-generated cover letters for each job';
COMMENT ON TABLE companies IS 'Target companies with application tracking';
COMMENT ON TABLE standard_answers IS 'Pre-defined answers for common application questions';
COMMENT ON TABLE bot_settings IS 'Configurable bot behavior settings';
COMMENT ON TABLE ai_usage_logs IS 'Token usage and cost tracking for Claude API';
COMMENT ON TABLE weekly_application_tracking IS 'Per-company weekly application limits';
