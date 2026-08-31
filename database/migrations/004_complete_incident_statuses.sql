-- Ensure every dashboard uses the same supported incident status vocabulary.
INSERT INTO incident_statuses (status_id, status_name)
VALUES (8, 'Action Taken'), (9, 'Rejected')
ON CONFLICT (status_id) DO UPDATE SET status_name = EXCLUDED.status_name;