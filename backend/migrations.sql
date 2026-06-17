-- migrations.sql
-- Run this in pgAdmin or via psql to upgrade your existing database

-- 1. Add Auth fields to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hashed_password VARCHAR;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'user';

-- 2. Create applied_jobs table
CREATE TABLE IF NOT EXISTS applied_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user_profiles(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    company VARCHAR NOT NULL,
    job_url VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'REQUIRES_MANUAL_ACTION',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_applied_jobs_user_id ON applied_jobs(user_id);
