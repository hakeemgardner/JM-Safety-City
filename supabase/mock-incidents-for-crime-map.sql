-- =============================================================================
-- Mock incident data for the Crime Map – ALL OVER JAMAICA
-- Run in Supabase → SQL Editor after seed-and-setup.sql
-- =============================================================================

insert into public.incident_reports (
  case_id,
  reported_date,
  reported_time,
  category,
  description,
  latitude,
  longitude,
  address
)
values
  ('SC-MOCK-001', current_date - 0, current_time - interval '12 minutes', 'theft', 'Robbery at store.', 18.0179, -76.7936, 'King Street, Downtown, Kingston'),
  ('SC-MOCK-002', current_date - 0, current_time - interval '35 minutes', 'assault', 'Physical altercation.', 18.0127, -76.7855, 'East Queen Street, Kingston'),
  ('SC-MOCK-003', current_date - 0, current_time - interval '1 hour', 'suspicious', 'Person acting suspiciously.', 18.0245, -76.8012, 'Half Way Tree, Kingston'),
  ('SC-MOCK-004', current_date - 0, current_time - interval '2 hours', 'vandalism', 'Vehicle break-in.', 18.0083, -76.7678, 'Windward Road, Kingston'),
  ('SC-MOCK-005', current_date - 0, current_time - interval '45 minutes', 'theft', 'Shoplifting incident.', 18.0155, -76.8105, 'Constant Spring Road, Kingston'),
  ('SC-MOCK-006', current_date - 0, current_time - interval '3 hours', 'traffic', 'Hit and run.', 18.0215, -76.7745, 'Mountain View Ave, Kingston'),
  ('SC-MOCK-007', current_date - 0, current_time - interval '20 minutes', 'suspicious', 'Loitering.', 18.0098, -76.7980, 'Parade, Downtown Kingston'),
  ('SC-MOCK-008', current_date - 0, current_time - interval '90 minutes', 'assault', 'Altercation.', 18.0042, -76.7520, 'Harbour View, Kingston'),
  ('SC-MOCK-009', current_date - 0, current_time - interval '5 hours', 'vandalism', 'Graffiti on wall.', 18.0320, -76.8150, 'Liguanea, Kingston'),
  ('SC-MOCK-010', current_date - 0, current_time - interval '4 hours', 'theft', 'Phone snatched.', 18.0170, -76.7630, 'Rockfort, Kingston'),
  ('SC-MOCK-011', current_date - 0, current_time - interval '25 minutes', 'suspicious', 'Suspicious vehicle circling.', 18.0290, -76.7890, 'New Kingston'),
  ('SC-MOCK-012', current_date - 0, current_time - interval '50 minutes', 'traffic', 'Reckless driving.', 18.0410, -76.8210, 'Barbican Road, Kingston'),
  ('SC-MOCK-013', current_date - 0, current_time - interval '8 minutes', 'theft', 'Armed robbery.', 18.0135, -76.7948, 'Orange Street, Kingston'),
  ('SC-MOCK-014', current_date - 0, current_time - interval '1 hour', 'assault', 'Stabbing incident.', 18.0198, -76.7802, 'Slipe Road, Kingston'),
  ('SC-MOCK-015', current_date - 0, current_time - interval '2 hours', 'other', 'Disturbance reported.', 18.0278, -76.8065, 'Cross Roads, Kingston'),
  ('SC-MOCK-016', current_date - 0, current_time - interval '15 minutes', 'theft', 'Purse snatched.', 18.0142, -76.7910, 'Barry Street, Kingston'),
  ('SC-MOCK-017', current_date - 0, current_time - interval '40 minutes', 'assault', 'Verbal dispute escalated.', 18.0220, -76.7820, 'Hope Road, Kingston'),
  ('SC-MOCK-018', current_date - 1, current_time + interval '8 hours', 'suspicious', 'Unknown person peering into vehicles.', 18.0185, -76.8050, 'Old Hope Road, Kingston'),
  ('SC-MOCK-019', current_date - 0, current_time - interval '1 hour 10 min', 'vandalism', 'Car window smashed.', 18.0090, -76.7710, 'Spanish Town Road, Kingston'),
  ('SC-MOCK-020', current_date - 0, current_time - interval '55 minutes', 'traffic', 'Speeding and weaving.', 18.0350, -76.8120, 'Liguanea Plaza area, Kingston'),
  ('SC-MOCK-021', current_date - 0, current_time - interval '30 minutes', 'theft', 'Break-in at residence.', 18.0110, -76.7870, 'Allman Town, Kingston'),
  ('SC-MOCK-022', current_date - 0, current_time - interval '2 hours 15 min', 'assault', 'Fight outside bar.', 18.0260, -76.7960, 'Trafalgar Road, Kingston'),
  ('SC-MOCK-023', current_date - 1, current_time + interval '6 hours', 'suspicious', 'Strange car parked for hours.', 18.0075, -76.7580, 'Port Royal Street, Kingston'),
  ('SC-MOCK-024', current_date - 0, current_time - interval '3 hours 20 min', 'vandalism', 'Property damage.', 18.0305, -76.7780, 'Mona, Kingston'),
  ('SC-MOCK-025', current_date - 0, current_time - interval '18 minutes', 'traffic', 'Running red light.', 18.0165, -76.8025, 'Half Way Tree roundabout, Kingston'),
  ('SC-MOCK-026', current_date - 0, current_time - interval '1 hour 30 min', 'theft', 'Bicycle stolen.', 18.0205, -76.7690, 'Duhaney Park, Kingston'),
  ('SC-MOCK-027', current_date - 0, current_time - interval '45 minutes', 'assault', 'Threats made.', 18.0130, -76.7995, 'Washington Blvd, Kingston'),
  ('SC-MOCK-028', current_date - 0, current_time - interval '4 hours 10 min', 'suspicious', 'Person taking photos of building.', 18.0380, -76.8280, 'Jack’s Hill area, Kingston'),
  ('SC-MOCK-029', current_date - 0, current_time - interval '2 hours 40 min', 'vandalism', 'Broken street light.', 18.0088, -76.7755, 'Rae Town, Kingston'),
  ('SC-MOCK-030', current_date - 0, current_time - interval '22 minutes', 'traffic', 'Near miss at intersection.', 18.0235, -76.7900, 'New Kingston Blvd, Kingston'),
  ('SC-MOCK-031', current_date - 0, current_time - interval '1 hour 45 min', 'theft', 'Package taken from porch.', 18.0310, -76.8090, 'Beverly Hills, Kingston'),
  ('SC-MOCK-032', current_date - 1, current_time + interval '10 hours', 'assault', 'Domestic dispute.', 18.0060, -76.7840, 'Trench Town, Kingston'),
  ('SC-MOCK-033', current_date - 0, current_time - interval '38 minutes', 'suspicious', 'Unfamiliar person asking questions.', 18.0255, -76.8135, 'University area, Kingston'),
  ('SC-MOCK-034', current_date - 0, current_time - interval '5 hours 30 min', 'vandalism', 'Tires slashed.', 18.0190, -76.7650, 'Dallas, Kingston'),
  ('SC-MOCK-035', current_date - 0, current_time - interval '12 minutes', 'traffic', 'Wrong-way driver.', 18.0175, -76.7955, 'North Street, Kingston'),
  ('SC-MOCK-036', current_date - 0, current_time - interval '3 hours 5 min', 'other', 'Noise complaint.', 18.0285, -76.7855, 'Stony Hill, Kingston'),
  ('SC-MOCK-037', current_date - 0, current_time - interval '50 minutes', 'theft', 'Wallet pickpocketed.', 18.0122, -76.8010, 'Papine, Kingston'),
  ('SC-MOCK-038', current_date - 0, current_time - interval '1 hour 5 min', 'assault', 'Pushing and shoving.', 18.0212, -76.7720, 'Mountain View, Kingston'),
  ('SC-MOCK-039', current_date - 0, current_time - interval '25 minutes', 'suspicious', 'Person in backyard.', 18.0340, -76.7980, 'Norbrook, Kingston'),
  ('SC-MOCK-040', current_date - 0, current_time - interval '6 hours', 'other', 'Abandoned vehicle.', 18.0100, -76.7600, 'Franklin Town, Kingston');

-- Note: Run once in Supabase SQL Editor. Running again inserts 100 more rows.
-- Covers: Kingston, Montego Bay, Negril, Ocho Rios, Port Antonio, Spanish Town,
-- Mandeville, Falmouth, Morant Bay, May Pen, Black River, Lucea, and more.
