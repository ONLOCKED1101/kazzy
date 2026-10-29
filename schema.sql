CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  succeeded INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS admin_login_attempts_ip_time_idx ON admin_login_attempts(ip_hash, attempted_at);

CREATE TABLE IF NOT EXISTS cars (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  price_ngn INTEGER,
  condition TEXT NOT NULL CHECK (condition IN ('foreign', 'local', 'new')),
  mileage_km INTEGER,
  cylinders INTEGER,
  transmission TEXT,
  fuel_type TEXT,
  interior_color TEXT,
  exterior_color TEXT,
  vin TEXT,
  vehicle_id TEXT,
  location TEXT,
  description TEXT,
  features_json TEXT NOT NULL DEFAULT '[]',
  media_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('available', 'sold', 'draft')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS cars_status_created_idx ON cars(status, created_at DESC);

INSERT OR IGNORE INTO cars (
  id, title, make, model, condition, transmission, fuel_type, location, description,
  features_json, media_json, status
) VALUES (
  'kazzy-demo-mercedes-gle',
  'Mercedes-Benz GLE 53 AMG',
  'Mercedes-Benz',
  'GLE 53 AMG',
  'foreign',
  'Automatic',
  'Petrol',
  'Lagos, Ipaja',
  'Dealership photo supplied by Kazzy Autos. Contact the team to confirm availability, year, exact specifications, condition, and price before arranging an inspection.',
  '["Air conditioning","Airbags","Alloy wheels","Bluetooth","Leather seats","Parking sensors","Reverse camera"]',
  '[{"type":"image","filename":"benz front shot.jpeg","alt":"Front view of a white Mercedes-Benz GLE at Kazzy Autos","url":"benz%20front%20shot.jpeg"},{"type":"image","filename":"benz.jpeg","alt":"Rear three-quarter view of a white Mercedes-Benz GLE","url":"benz.jpeg"},{"type":"image","filename":"benz back.jpeg","alt":"Rear view of a white Mercedes-Benz GLE","url":"benz%20back.jpeg"},{"type":"image","filename":"benz 6.jpeg","alt":"White Mercedes-Benz SUV photographed at the dealership","url":"benz%206.jpeg"},{"type":"image","filename":"benz2.jpeg","alt":"Black Mercedes-Benz SUV photographed at the dealership","url":"benz2.jpeg"}]',
  'available'
);

INSERT OR IGNORE INTO cars (
  id, title, make, model, condition, transmission, location, description,
  features_json, media_json, status
) VALUES (
  'kazzy-demo-toyota-tundra',
  'Toyota Tundra',
  'Toyota',
  'Tundra',
  'foreign',
  'Automatic',
  'Lagos, Ipaja',
  'Dealership photos supplied by Kazzy Autos. Contact the team to confirm availability, year, exact specifications, condition, and price before arranging an inspection.',
  '["Air conditioning","Airbags","Alloy wheels","Pickup truck"]',
  '[{"type":"image","filename":"hilux2.jpeg","alt":"Side view of a blue Toyota Tundra pickup at Kazzy Autos","url":"hilux2.jpeg"},{"type":"image","filename":"hilux.jpeg","alt":"Front view of a blue Toyota Tundra pickup","url":"hilux.jpeg"}]',
  'available'
);

INSERT OR IGNORE INTO cars (
  id, title, make, model, year, price_ngn, condition, mileage_km, cylinders,
  transmission, fuel_type, interior_color, exterior_color, vin, vehicle_id, location, description,
  features_json, media_json, status
) VALUES (
  'autochek-lexus-es-2010-reference',
  'Lexus ES',
  'Lexus',
  'ES',
  2010,
  9500000,
  'foreign',
  70495,
  6,
  'Automatic',
  'Petrol',
  'Gray',
  'Silver',
  'JTHB*************',
  'zkiKyCn98',
  'Lagos, Ipaja',
  'Reference listing details supplied for the 2010 Lexus ES. This is a draft until Kazzy Autos verifies that the car is in its inventory, confirms the price and vehicle details, and adds authorized vehicle photos.',
  '["4 wheel drive","Airbags","Air conditioning","Alloy wheels","Active parking assist","Armrests","AM/FM radio","Cup holders","CD player","Fog lights","Leather seats","Parking sensor","Bluetooth hands-free","Central locking","DVD system","Rear entertainment system","Seat belts","ABS","Reverse camera"]',
  '[]',
  'draft'
);
