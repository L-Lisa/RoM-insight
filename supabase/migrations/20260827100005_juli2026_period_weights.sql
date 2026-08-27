-- A/B/C-vikter per period (Beräkningssnurra-flikarna) — grund för T5
insert into period_weights (period, weight_a, weight_b, weight_c, source_file) values
('2026-01-01', 0.701797, 0.957624, 1.313708, 'resultatuppfoljning-och-resultatoversyn-rusta-och-matcha-juli-2026.xlsx'),
('2026-03-01', 0.708189, 0.966347, 1.325675, 'resultatuppfoljning-och-resultatoversyn-rusta-och-matcha-juli-2026.xlsx'),
('2026-05-01', 0.710678, 0.969742, 1.330332, 'resultatuppfoljning-och-resultatoversyn-rusta-och-matcha-juli-2026.xlsx'),
('2026-07-01', 0.709269, 0.96782, 1.327695, 'resultatuppfoljning-och-resultatoversyn-rusta-och-matcha-juli-2026.xlsx')
on conflict (period) do nothing;
