-- Insert sample experiences for testing and demo purposes
INSERT INTO experiences (id, type, slug, title, description, tags, metadata) VALUES 
(
    uuid_generate_v4(),
    'webinar_live',
    'future-of-marketing-automation',
    'The Future of Marketing Automation: Trends for 2024',
    'Join our experts as they discuss the latest trends in marketing automation and how to leverage them for your business growth.',
    ARRAY['marketing', 'automation', 'trends', 'growth'],
    jsonb_build_object(
        'start_time', '2024-12-15T14:00:00Z',
        'duration_minutes', 60,
        'presenter_name', 'Sarah Johnson',
        'presenter_title', 'Head of Marketing',
        'presenter_company', 'GrowthCorp',
        'registration_url', 'https://example.com/register',
        'thumbnail_url', 'https://example.com/thumbnails/webinar1.jpg',
        'capacity', 500,
        'registered_count', 127,
        'status', 'upcoming'
    )
),
(
    uuid_generate_v4(),
    'demo',
    'product-demo-crm-integration',
    'CRM Integration Demo: See It in Action',
    'Experience our seamless CRM integration that automatically syncs lead data and provides real-time insights.',
    ARRAY['demo', 'crm', 'integration', 'sales'],
    jsonb_build_object(
        'duration_minutes', 30,
        'demo_url', 'https://example.com/demo',
        'thumbnail_url', 'https://example.com/thumbnails/demo1.jpg',
        'calendar_link', 'https://calendly.com/demo',
        'requirements', ARRAY['CRM system', 'Admin access'],
        'features_highlighted', ARRAY['Real-time sync', 'Lead scoring', 'Analytics dashboard'],
        'industry_focus', ARRAY['SaaS', 'E-commerce', 'Financial Services']
    )
),
(
    uuid_generate_v4(),
    'quiz',
    'marketing-maturity-assessment',
    'Marketing Maturity Assessment',
    'Discover where your marketing organization stands and get personalized recommendations for improvement.',
    ARRAY['quiz', 'assessment', 'marketing', 'strategy'],
    jsonb_build_object(
        'total_questions', 15,
        'estimated_minutes', 8,
        'passing_score', 70,
        'result_types', ARRAY['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        'questions', jsonb_build_array(
            jsonb_build_object(
                'id', 'q1',
                'type', 'single_choice',
                'question', 'How would you describe your current marketing attribution model?',
                'options', ARRAY['We don''t track attribution', 'Basic first-touch attribution', 'Multi-touch attribution', 'Advanced algorithmic attribution'],
                'required', true,
                'points', 10
            ),
            jsonb_build_object(
                'id', 'q2',
                'type', 'single_choice',
                'question', 'What percentage of your leads are generated through digital channels?',
                'options', ARRAY['Less than 25%', '25-50%', '50-75%', 'More than 75%'],
                'required', true,
                'points', 10
            )
        )
    )
),
(
    uuid_generate_v4(),
    'resource',
    'complete-guide-lead-scoring',
    'The Complete Guide to Lead Scoring',
    'A comprehensive 45-page guide covering everything you need to know about implementing effective lead scoring in your organization.',
    ARRAY['guide', 'lead-scoring', 'sales', 'qualification'],
    jsonb_build_object(
        'resource_type', 'guide',
        'file_url', 'https://example.com/resources/lead-scoring-guide.pdf',
        'file_size', '2.3 MB',
        'page_count', 45,
        'download_count', 1247,
        'thumbnail_url', 'https://example.com/thumbnails/guide1.jpg',
        'preview_url', 'https://example.com/preview/lead-scoring-guide',
        'gated', true
    )
),
(
    uuid_generate_v4(),
    'webinar_on_demand',
    'advanced-segmentation-strategies',
    'Advanced Customer Segmentation Strategies',
    'Learn how to create sophisticated customer segments that drive higher engagement and conversion rates.',
    ARRAY['segmentation', 'strategy', 'customers', 'engagement'],
    jsonb_build_object(
        'duration_minutes', 45,
        'presenter_name', 'Michael Chen',
        'presenter_title', 'VP of Growth',
        'presenter_company', 'SegmentPro',
        'recording_url', 'https://example.com/recordings/segmentation-webinar',
        'thumbnail_url', 'https://example.com/thumbnails/webinar2.jpg',
        'status', 'recorded'
    )
);

-- Insert sample rules for Slack alerts
INSERT INTO rules (id, name, active, conditions, channel, template, throttle_window_seconds) VALUES
(
    uuid_generate_v4(),
    'High-Value Demo Request',
    true,
    jsonb_build_object(
        'and', jsonb_build_array(
            jsonb_build_object('action', 'equals', 'form_submitted'),
            jsonb_build_object('experience_type', 'equals', 'demo'),
            jsonb_build_object('enrichment.seniority', 'in', ARRAY['Director', 'VP', 'C-Suite'])
        )
    ),
    '#sales-alerts',
    '🚨 High-value demo request!\n\n*{{profile.first_name}} {{profile.last_name}}* ({{enrichment.title}}) from *{{profile.company}}* just requested a demo.\n\n📊 Company size: {{enrichment.company_size}}\n🎯 Source: {{attribution_first.source}}\n\n<{{experience.demo_url}}|View Demo> | <{{profile.crm_url}}|View in CRM>',
    300
),
(
    uuid_generate_v4(),
    'Quiz Completion - High Score',
    true,
    jsonb_build_object(
        'and', jsonb_build_array(
            jsonb_build_object('action', 'equals', 'quiz_completed'),
            jsonb_build_object('value', 'gte', 80)
        )
    ),
    '#marketing-qualified',
    '🎯 High-scoring quiz completion!\n\n*{{profile.first_name}} {{profile.last_name}}* scored {{value}}% on "{{experience.title}}"\n\n🏢 Company: {{profile.company}}\n📧 Email: {{profile.email}}\n📊 Score: {{value}}/100\n\n<{{experience.url}}|View Quiz> | <{{profile.crm_url}}|View Contact>',
    600
);