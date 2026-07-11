-- A/B/C-vikter per period (Beräkningssnurra-flikarna) — grund för T5
insert into period_weights (period, weight_a, weight_b, weight_c, source_file) values
('2025-03-01', 0.662991, 0.904672, 1.241066, 'resultatuppfoljning-mars-november-2025.xlsx'),
('2025-05-01', 0.665641, 0.908289, 1.246028, 'resultatuppfoljning-mars-november-2025.xlsx'),
('2025-07-01', 0.671496, 0.916278, 1.256988, 'resultatuppfoljning-mars-november-2025.xlsx'),
('2025-09-01', 0.680181, 0.928129, 1.273246, 'resultatuppfoljning-mars-november-2025.xlsx'),
('2025-11-01', 0.693028, 0.945659, 1.297294, 'resultatuppfoljning-mars-november-2025.xlsx'),
('2026-01-01', 0.701797, 0.957624, 1.313708, 'resultatuppfoljning-maj-2026.xlsx'),
('2026-03-01', 0.708189, 0.966347, 1.325675, 'resultatuppfoljning-maj-2026.xlsx'),
('2026-05-01', 0.710678, 0.969742, 1.330332, 'resultatuppfoljning-maj-2026.xlsx')
on conflict (period) do nothing;
