-- Custom SQL migration file, put your code below! --

-- TRIGGER FUNCTION: Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- USERS
CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- USER_PROFILES
CREATE TRIGGER user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- PROJECTS
CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- PROJECT_MEMBERS
CREATE TRIGGER project_members_updated_at
BEFORE UPDATE ON project_members
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- TASKS
CREATE TRIGGER tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();