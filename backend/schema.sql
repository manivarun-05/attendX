-- SUPABASE SQL SCHEMA FOR ATTENDX

-- Enable the pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUMS
CREATE TYPE user_role AS ENUM ('student', 'faculty', 'admin');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE face_attempt_result AS ENUM ('pass', 'fail', 'spoof_detected');

-- 1. COLLEGES
CREATE TABLE colleges (
    college_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) UNIQUE NOT NULL,
    address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_colleges_domain ON colleges(domain);

-- 2. USERS (extends Supabase Auth, mapping auth.uid to user_id)
CREATE TABLE users (
    user_id UUID PRIMARY KEY, -- matches auth.users.id
    college_id UUID REFERENCES colleges(college_id),
    role user_role NOT NULL,
    email VARCHAR(320) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_college_role ON users(college_id, role);

-- 3. STUDENTS
CREATE TABLE students (
    student_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    roll_number VARCHAR(50) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    section VARCHAR(20) NOT NULL,
    semester INT NOT NULL,
    cgpa DECIMAL(4,2),
    face_encoding BYTEA, -- for DeepFace
    CONSTRAINT unique_roll_college UNIQUE (student_id, roll_number)
);
CREATE INDEX idx_students_branch_sec_sem ON students(branch, section, semester);

-- 4. COURSES
CREATE TABLE courses (
    course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID REFERENCES colleges(college_id),
    faculty_id UUID REFERENCES users(user_id),
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    branch VARCHAR(100),
    section VARCHAR(20),
    semester INT,
    academic_year VARCHAR(20),
    total_sessions INT DEFAULT 0
);
CREATE INDEX idx_courses_fac ON courses(college_id, faculty_id);
CREATE INDEX idx_courses_target ON courses(branch, section, semester);

-- 5. COURSE SESSIONS
CREATE TABLE course_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
    class_number INT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIMETZ NOT NULL,
    end_time TIMETZ NOT NULL,
    qr_token VARCHAR(512) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_course_date ON course_sessions(course_id, session_date DESC);
CREATE INDEX idx_sessions_qr ON course_sessions(qr_token);

-- 6. ATTENDANCE RECORDS
CREATE TABLE attendance_records (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES course_sessions(session_id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(course_id) ON DELETE CASCADE,
    status attendance_status DEFAULT 'present',
    face_match_score FLOAT,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    device_fingerprint VARCHAR(255),
    UNIQUE (session_id, student_id)
);
CREATE INDEX idx_attendance_stu_crs_time ON attendance_records(student_id, course_id, scanned_at DESC);
CREATE INDEX idx_attendance_ses_st ON attendance_records(session_id, status);

-- 7. FACE VERIFICATION LOG
CREATE TABLE face_verification_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
    attempt_result face_attempt_result NOT NULL,
    confidence_score FLOAT NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET
);
CREATE INDEX idx_face_log_stu_time ON face_verification_log(student_id, attempted_at DESC);


-- ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Assuming standard JWT claim checking or trusting the service role for the backend.
-- In this architecture, FastAPI acts as a secure backend using service_role key, bypassing RLS.
-- However, for the frontend to query:

-- Example policies (can be refined):
CREATE POLICY "Public read colleges" ON colleges FOR SELECT USING (true);
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = user_id);
-- ... More specific frontend RLS would go here, relying mainly on backend validation for MVP.
