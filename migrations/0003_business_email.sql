UPDATE footer_settings SET email = 'maidargantuu120@gmail.com';
UPDATE users SET email = 'maidargantuu120@gmail.com'
WHERE is_admin = 1 AND email = 'admin@meatmall.local';
UPDATE site_content SET content = replace(content, 'arvijix@gmail.com', 'maidargantuu120@gmail.com');
UPDATE site_settings SET value = replace(value, 'arvijix@gmail.com', 'maidargantuu120@gmail.com');
UPDATE site_content SET content = replace(content, 'info@gerinmah.mn', 'maidargantuu120@gmail.com');
UPDATE site_settings SET value = replace(value, 'info@gerinmah.mn', 'maidargantuu120@gmail.com');
UPDATE site_content SET content = replace(content, 'noreply@gerinmah.com', 'maidargantuu120@gmail.com');
UPDATE site_settings SET value = replace(value, 'noreply@gerinmah.com', 'maidargantuu120@gmail.com');
UPDATE site_content SET content = replace(content, 'support@gerinmah.com', 'maidargantuu120@gmail.com');
UPDATE site_settings SET value = replace(value, 'support@gerinmah.com', 'maidargantuu120@gmail.com');
UPDATE site_content SET content = replace(content, 'noreply@arvijix.com', 'maidargantuu120@gmail.com');
UPDATE site_settings SET value = replace(value, 'noreply@arvijix.com', 'maidargantuu120@gmail.com');
UPDATE site_content SET content = replace(content, 'support@arvijix.com', 'maidargantuu120@gmail.com');
UPDATE site_settings SET value = replace(value, 'support@arvijix.com', 'maidargantuu120@gmail.com');
UPDATE site_content SET content = replace(content, 'admin@arvijix.com', 'maidargantuu120@gmail.com');
UPDATE site_settings SET value = replace(value, 'admin@arvijix.com', 'maidargantuu120@gmail.com');
