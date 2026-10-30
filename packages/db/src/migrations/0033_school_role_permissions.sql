-- Perbaikan string permission role sekolah (B2B).
--
-- Konvensi yang diparse `packages/auth/src/permissions-core.ts` hanya 2 bagian:
--   `action:resource` (mis. access:school_dashboard) atau `resource.action` (mis. participant.read).
-- String 3 bagian seperti `assessment.school.read` salah parse (resource=assessment, action=school),
-- jadi diganti ke resource yang benar. Berlaku untuk DB yang sudah menjalankan 0030.

UPDATE "role"
SET "permissions" = ARRAY[
  'access:school_dashboard',
  'participant.read',
  'participant.update',
  'schedule.create',
  'schedule.read',
  'schedule.update',
  'schedule.delete',
  'report.read',
  'user.read'
]
WHERE "id" = 'school_admin';

UPDATE "role"
SET "permissions" = ARRAY['access:school_dashboard', 'report.read', 'user.read']
WHERE "id" = 'school_viewer';
