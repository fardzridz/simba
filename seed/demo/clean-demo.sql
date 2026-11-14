-- Menghapus seluruh data demo (id berawalan demo_).
-- Dihasilkan scripts/build-demo-seed.mjs --clean.

DELETE FROM activity_logs WHERE id LIKE 'log_demo_%';
DELETE FROM notifications WHERE id LIKE 'ntf_demo_%';
DELETE FROM document_archive WHERE id LIKE 'arc_demo_%';
DELETE FROM task_reviews WHERE id LIKE 'rev_demo_%';
DELETE FROM attachments WHERE id LIKE 'att_demo_%';
DELETE FROM task_submissions WHERE id LIKE 'sub_demo_%';
DELETE FROM task_assignments WHERE id LIKE 'asg_demo_%';
DELETE FROM tasks WHERE id LIKE 'tsk_demo_%';
DELETE FROM users WHERE id LIKE 'usr_demo_%';
