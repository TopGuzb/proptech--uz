-- Disable Row Level Security on floors and apartments tables
-- Run this in your Supabase SQL Editor

-- Disable RLS on floors table
ALTER TABLE floors DISABLE ROW LEVEL SECURITY;

-- Disable RLS on apartments table  
ALTER TABLE apartments DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('floors', 'apartments')
AND schemaname = 'public';
