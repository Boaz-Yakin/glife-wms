-- Phase 39: Add Staging Floor Locations (LOC-S0101A01 ~ LOC-S0110A01)
-- Allows temporary floor staging before put-away, with Option A (immediate available stock & cross-docking)

INSERT INTO public.locations (code, zone_type)
VALUES
    ('LOC-S0101A01', 'A'),
    ('LOC-S0102A01', 'A'),
    ('LOC-S0103A01', 'A'),
    ('LOC-S0104A01', 'A'),
    ('LOC-S0105A01', 'A'),
    ('LOC-S0106A01', 'A'),
    ('LOC-S0107A01', 'A'),
    ('LOC-S0108A01', 'A'),
    ('LOC-S0109A01', 'A'),
    ('LOC-S0110A01', 'A')
ON CONFLICT (code) DO NOTHING;
