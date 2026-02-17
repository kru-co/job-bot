-- Job Bot: Seed Test Jobs
-- Run this in Supabase SQL Editor to populate sample data
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)

INSERT INTO jobs (
  title, company, company_id, location, remote, url,
  description, requirements, salary_min, salary_max,
  source, match_quality, match_confidence, match_reasoning,
  status, discovered_date, posted_date
)
SELECT
  j.title, j.company,
  (SELECT id FROM companies WHERE name = j.company LIMIT 1),
  j.location, j.remote, j.url,
  j.description, j.requirements, j.salary_min, j.salary_max,
  j.source, j.match_quality, j.match_confidence, j.match_reasoning,
  j.status,
  NOW() - (j.days_ago || ' days')::INTERVAL,
  NOW() - (j.days_ago || ' days')::INTERVAL - INTERVAL '5 days'
FROM (VALUES

  -- PERFECT MATCH JOBS (discovered, queued)
  (
    'Senior Product Manager, Alexa Smart Home', 'Amazon', 'Seattle, WA', true,
    'https://amazon.jobs/en/jobs/2345678/sr-pm-alexa',
    'Lead product strategy for Alexa Smart Home integrations. You will define the roadmap for Matter/Thread protocol support, partner integrations, and the next generation of smart home experiences. Work cross-functionally with hardware, software, and partner teams to deliver products used by millions.',
    '5+ years PM experience. IoT or smart home product experience strongly preferred. Experience with hardware/software products. Strong analytical skills and data-driven decision making.',
    165000, 220000, 'greenhouse', 'perfect', 91,
    'Strong alignment with Josh''s IoT PM background. Alexa Smart Home directly matches his experience with connected device ecosystems. Salary range fits target. Seattle location with remote option.',
    'discovered', 2
  ),
  (
    'Product Manager, Azure IoT Platform', 'Microsoft', 'Redmond, WA', true,
    'https://careers.microsoft.com/jobs/987654/pm-azure-iot',
    'Drive the product vision for Azure IoT Hub and Device Provisioning Service. Define APIs, SDKs, and developer experiences that enable thousands of companies to connect billions of devices. Partner with engineering on platform architecture and go-to-market with sales and marketing.',
    'BS/MS in CS or related field. 4-7 years of product management. Cloud platform experience preferred. Strong technical acumen and ability to work with engineering teams.',
    160000, 210000, 'rss', 'perfect', 88,
    'Azure IoT aligns well with cloud + IoT experience. Microsoft is a high-priority target company. Salary and role level fit. Redmond is local with hybrid flexibility.',
    'queued', 1
  ),
  (
    'Senior PM, Nest Devices & Ecosystem', 'Google', 'Sunnyvale, CA', false,
    'https://careers.google.com/jobs/1234567/sr-pm-nest',
    'Own product strategy for Nest camera and doorbell product lines. Define the roadmap for ML-powered features like person/package detection, familiar face recognition, and proactive notifications. Collaborate with hardware, AI/ML, and UX teams to ship delightful experiences.',
    '6+ years PM experience. Consumer hardware product experience required. Experience with ML/AI features a plus. Exceptional communication and stakeholder management skills.',
    175000, 235000, 'greenhouse', 'perfect', 85,
    'Nest aligns directly with Josh''s smart home and consumer hardware PM experience. Google is a high priority target. Requires relocation to Sunnyvale — may be a limiting factor.',
    'discovered', 3
  ),
  (
    'Product Manager, HomeKit & Home App', 'Apple', 'Cupertino, CA', false,
    'https://jobs.apple.com/en-us/details/200567890/pm-homekit',
    'Lead product strategy for HomeKit framework and the Home app. Define the developer platform roadmap, home architecture standards, and consumer-facing features for Apple''s smart home ecosystem. Work with hardware, software, and partner teams to evolve the Matter standard integration.',
    'Proven track record shipping consumer software products. Deep understanding of smart home ecosystems. Experience working with third-party developer partners. 5+ years PM experience.',
    180000, 250000, 'manual', 'perfect', 89,
    'HomeKit is a near-perfect match — smart home ecosystem PM with partner developer experience. Apple is top-priority. Cupertino requires relocation. Compensation is top of range.',
    'discovered', 0
  ),
  (
    'Sr. Product Manager, Rivian Software Platform', 'Rivian', 'Palo Alto, CA', true,
    'https://rivian.com/careers/job/45678-sr-pm-software-platform',
    'Define the product strategy for Rivian''s in-vehicle software platform. Own the roadmap for OTA updates, vehicle app ecosystem, and driver personalization features. Partner with hardware engineering, software, and UX to deliver a best-in-class connected vehicle experience.',
    '5+ years in software PM. Experience with IoT or connected devices strongly preferred. Passion for EVs and sustainable transportation. Able to work cross-functionally in a fast-paced environment.',
    155000, 200000, 'lever', 'perfect', 86,
    'Connected vehicle software platform maps to Josh''s IoT systems experience. Rivian is a medium-priority target in the EV space. Strong mission alignment. Remote-friendly.',
    'discovered', 5
  ),

  -- WIDER NET JOBS
  (
    'Product Manager, AWS Lambda & Serverless', 'Amazon', 'Seattle, WA', true,
    'https://amazon.jobs/en/jobs/2345690/pm-aws-lambda',
    'Drive product strategy for AWS Lambda, the industry-leading serverless compute platform. Define the roadmap for new runtimes, performance improvements, and developer experience enhancements. Work with the world''s largest developer community to understand needs and prioritize investments.',
    '4+ years PM experience. Developer tools or cloud infrastructure experience preferred. Strong technical background. Ability to synthesize customer feedback into product decisions.',
    155000, 205000, 'rss', 'wider_net', 68,
    'Developer tools PM is tangential to Josh''s hardware/IoT focus. AWS is high priority but this role lacks the connected devices angle. Good platform PM experience would transfer.',
    'discovered', 4
  ),
  (
    'Senior PM, Microsoft Teams Devices', 'Microsoft', 'Redmond, WA', true,
    'https://careers.microsoft.com/jobs/876543/sr-pm-teams-devices',
    'Lead product strategy for Teams-certified hardware devices including Room Systems, headsets, and displays. Define device certification requirements, partner integration standards, and the roadmap for AI-powered meeting experiences.',
    '5+ years PM experience. Experience with hardware-software products preferred. Strong partner management skills. Experience with enterprise software a plus.',
    158000, 208000, 'rss', 'wider_net', 72,
    'Hardware device ecosystem aligns moderately well. Enterprise meeting hardware is less aligned than consumer IoT but demonstrates hardware partner ecosystem management. Microsoft is priority.',
    'queued', 2
  ),
  (
    'Product Manager, Google Pixel Accessories', 'Google', 'Mountain View, CA', false,
    'https://careers.google.com/jobs/2345678/pm-pixel-accessories',
    'Own the product roadmap for Pixel Watch bands, Pixel Buds accessories, and Pixel charging ecosystem. Drive decisions on materials, features, pricing, and the partner accessory program.',
    '3-5 years PM experience. Consumer hardware or accessories experience. Strong business acumen and cross-functional collaboration skills.',
    140000, 185000, 'greenhouse', 'wider_net', 60,
    'Accessories PM is less strategic than core IoT/platform roles. Requires relocation. Moderate fit with hardware product experience.',
    'discovered', 7
  ),
  (
    'Product Manager, Stripe Terminal', 'Stripe', 'San Francisco, CA', true,
    'https://stripe.com/jobs/listing/pm-terminal-456789',
    'Lead product strategy for Stripe Terminal, our hardware point-of-sale product. Define the roadmap for new hardware form factors, SDK improvements, and the partner integration program for payment hardware.',
    '4-6 years PM experience. Hardware + software product experience strongly preferred. Strong developer empathy. Experience with platform APIs a plus.',
    165000, 215000, 'lever', 'wider_net', 70,
    'Terminal is hardware + software platform which aligns well with IoT experience. Stripe is a medium priority target. Payments is a new domain but the product shape is familiar.',
    'discovered', 3
  ),
  (
    'Senior PM, Shopify POS Hardware', 'Shopify', 'Remote', true,
    'https://shopify.com/careers/job/34567-sr-pm-pos-hardware',
    'Define the product vision for Shopify''s POS hardware ecosystem including card readers, receipt printers, barcode scanners, and the Shopify POS Hub. Drive integration with software platform and merchant experience.',
    '5+ years PM experience. Hardware product experience required. Strong merchant or retail domain understanding. Remote-first team.',
    145000, 195000, 'lever', 'wider_net', 65,
    'POS hardware ecosystem has overlap with IoT hardware PM skills. Shopify is medium priority. Commerce/retail domain is new territory. Fully remote is a plus.',
    'discovered', 6
  ),

  -- APPLIED JOBS (historical)
  (
    'Product Manager, Meta Portal & Devices', 'Meta', 'Menlo Park, CA', true,
    'https://metacareers.com/jobs/567890123/pm-portal-devices',
    'Lead product strategy for Meta Portal smart displays and the broader home devices portfolio. Define roadmap for AR features, video calling experiences, and smart home integrations.',
    '5+ years PM. Consumer hardware experience. Strong design sensibility. Comfortable in ambiguous, fast-moving environment.',
    170000, 230000, 'greenhouse', 'perfect', 87,
    'Portal and Meta devices directly align with smart home/IoT PM experience. VR/AR adjacency is a growth area. High priority target company.',
    'applied', 14
  ),
  (
    'Senior Product Manager, Tesla App & Connectivity', 'Tesla', 'Austin, TX', false,
    'https://tesla.com/careers/search/job/678901/sr-pm-app',
    'Own the Tesla mobile app and vehicle connectivity product roadmap. Define features for remote vehicle control, charging management, energy monitoring, and third-party integrations.',
    '6+ years PM experience. Mobile + connected devices experience. Strong data skills. Passion for EVs and energy products.',
    155000, 210000, 'rss', 'perfect', 82,
    'Tesla app + connectivity is IoT-adjacent with strong platform elements. Austin requires relocation. Tesla is medium priority.',
    'applied', 21
  ),

  -- SKIPPED JOBS
  (
    'Product Manager, AWS DynamoDB', 'Amazon', 'Seattle, WA', true,
    'https://amazon.jobs/en/jobs/2345700/pm-dynamodb',
    'Drive product strategy for Amazon DynamoDB, our flagship NoSQL database. Define features for performance, cost optimization, and developer experience for this globally distributed database service.',
    '4+ years PM experience. Database or infrastructure background strongly preferred. Deep technical skills required. Experience with distributed systems.',
    150000, 200000, 'rss', 'wider_net', 42,
    'Database infrastructure PM is far from Josh''s IoT/hardware experience. Technical depth requirement in distributed systems is a stretch.',
    'skipped', 10
  ),
  (
    'PM, Google Cloud Security', 'Google', 'Sunnyvale, CA', false,
    'https://careers.google.com/jobs/3456789/pm-cloud-security',
    'Lead product strategy for Google Cloud security products including IAM, Security Command Center, and Chronicle SIEM. Partner with enterprise sales and security customers.',
    '5+ years PM. Security domain expertise required. Enterprise software experience. CISSP or equivalent preferred.',
    165000, 220000, 'greenhouse', 'no_match', 25,
    'Security domain has minimal overlap with Josh''s background. Enterprise security PM is a significant pivot. Skipping.',
    'skipped', 8
  )

) AS j(title, company, location, remote, url, description, requirements, salary_min, salary_max, source, match_quality, match_confidence, match_reasoning, status, days_ago)
ON CONFLICT (url) DO NOTHING;

-- Summary
SELECT
  status,
  match_quality,
  COUNT(*) as count
FROM jobs
GROUP BY status, match_quality
ORDER BY status, match_quality;
