-- Seed data for users table
INSERT INTO users (id, username, password) 
VALUES (1, 'default', 'default_password')
ON CONFLICT (id) DO NOTHING;

-- Seed data for standards table
INSERT INTO standards (id, code, description, grade_level, subject_area)
VALUES 
  (1, 'MS-ESS1-1', 'Develop and use a model of the Earth-sun-moon system to describe the cyclic patterns of lunar phases, eclipses of the sun and moon, and seasons.', '6', 'science'),
  (2, 'MS-ESS1-2', 'Develop and use a model to describe the role of gravity in the motions within galaxies and the solar system.', '6', 'science'),
  (3, 'MS-ESS1-3', 'Analyze and interpret data to determine scale properties of objects in the solar system.', '6', 'science'),
  (4, 'MS-ESS1-4', 'Construct a scientific explanation based on evidence from rock strata for how the geologic time scale is used to organize Earth''s 4.6-billion-year-old history.', '6', 'science')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for users if needed
SELECT SETVAL('users_id_seq', (SELECT MAX(id) FROM users));

-- Reset sequence for standards if needed
SELECT SETVAL('standards_id_seq', (SELECT MAX(id) FROM standards));