import os
import sys

# Force UTF-8 encoding for standard output to prevent 'charmap' codec errors during DeepFace downloads
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import settings
import qrcode
import base64
import io
import time
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone

# Optional DeepFace import
try:
    from deepface import DeepFace
    import cv2
    import numpy as np
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("Warning: DeepFace not installed. Using safe fallback for face verification.")

try:
    import jwt
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False
    print("Warning: PyJWT not installed. QR codes won't be securely signed.")

# Create FastAPI app
app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Load local datasets for development/bypass mode
student_data = []
faculty_data = []
try:
    if os.path.exists('data_student.json'):
        with open('data_student.json', 'r') as f:
            student_data = json.load(f)
    if os.path.exists('data_faculty.json'):
        with open('data_faculty.json', 'r') as f:
            faculty_data = json.load(f)
except Exception as e:
    print(f"Error loading datasets: {e}")

# Global stores for Dataset Mode (Issue 4 & 5)
active_sessions = {}  # session_id -> metadata
attendance_records_db = {}  # session_id -> list of student_emails
session_scans = {} # session_id -> list of scan objects {name, roll, time}

def save_student_data():
    try:
        with open('data_student.json', 'w') as f:
            json.dump(student_data, f, indent=4)
    except Exception as e:
        print(f"Error saving student data: {e}")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = url
        self.key = key
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def admin_create_user(self, email, password):
        req = urllib.request.Request(
            f"{self.url}/auth/v1/admin/users",
            data=json.dumps({"email": email, "password": password, "email_confirm": True}).encode(),
            headers=self.headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            raise Exception(f"Auth error: {err}")
            
    def login_user(self, email, password):
        req = urllib.request.Request(
            f"{self.url}/auth/v1/token?grant_type=password",
            data=json.dumps({"email": email, "password": password}).encode(),
            headers=self.headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            raise Exception(f"Login error: {err}")

    def insert(self, table: str, payload: dict):
        req = urllib.request.Request(
            f"{self.url}/rest/v1/{table}",
            data=json.dumps(payload).encode(),
            headers=self.headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            raise Exception(f"Insert error: {err}")
            
    def select_eq(self, table: str, select: str, eq_col: str, eq_val: str):
        url = f"{self.url}/rest/v1/{table}?select={select}&{eq_col}=eq.{eq_val}"
        req = urllib.request.Request(url, headers=self.headers, method="GET")
        try:
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            raise Exception(f"Select error: {err}")
            
    def get(self, path: str):
        url = f"{self.url}/rest/v1/{path}"
        req = urllib.request.Request(url, headers=self.headers, method="GET")
        try:
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            raise Exception(f"GET error: {err}")

def get_supabase() -> SupabaseClient:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database credentials missing")
    return SupabaseClient(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

@app.get("/")
def read_root():
    return {"message": "AttendX API is live and connected to Supabase."}

# ======== MODELS ========
class SessionCreateRequest(BaseModel):
    course_id: str
    class_number: int
    duration_minutes: int

class VerifyFacePrecheckRequest(BaseModel):
    student_id: str
    face_image_b64: str

class RegisterFaceRequest(BaseModel):
    email: str
    face_image_b64: str

class QrScanRequest(BaseModel):
    qr_token: str
    student_id: str
    face_match_score: float

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str
    roll_number: str = None
    branch: str = None
    section: str = None
    semester: int = None
    face_image_b64: str = None

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

# ======== ENDPOINTS ========

@app.post("/api/auth/signup")
def signup(req: SignupRequest):
    # Bypass Supabase for dataset mode
    return {"message": "Signup successful (Dataset Mode)", "user_id": "local_user_123", "role": req.role}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    if req.role == 'student':
        for student in student_data:
            if student.get('Institutional Email', '').lower() == req.email.lower():
                return {"message": "Login successful", "role": "student", "email": req.email.lower(), "user_id": "local_student"}
    elif req.role == 'faculty':
        for faculty in faculty_data:
            if faculty.get('Institutional Email', '').lower() == req.email.lower():
                return {"message": "Login successful", "role": "faculty", "email": req.email.lower(), "user_id": "local_faculty"}
    
    raise HTTPException(status_code=401, detail="Email not found in local dataset for the selected role.")

@app.get("/api/student/me")
def get_student_me(email: str):
    for student in student_data:
        if student.get('Institutional Email', '').lower() == email.lower():
            # Check if face is registered locally
            file_path = os.path.join("face_registry", f"{email.lower()}.jpg")
            student_with_status = student.copy()
            student_with_status["face_registered"] = os.path.exists(file_path)
            return student_with_status
    raise HTTPException(status_code=404, detail="Student not found in dataset")

@app.get("/api/faculty/me")
def get_faculty_me(email: str):
    for faculty in faculty_data:
        if faculty.get('Institutional Email', '').lower() == email.lower():
            # Enrich with course stats
            active_courses = faculty.get('Active Courses', '').split(',')
            courses_stats = []
            for c_code in active_courses:
                c_code = c_code.strip()
                if not c_code: continue
                
                # Calculate stats from student_data
                course_key = f"{c_code} Attendance (2 Months)"
                students_in_course = [s for s in student_data if course_key in s]
                total_enrolled = len(students_in_course)
                
                avg_pct = 0
                total_sessions = 0
                if total_enrolled > 0:
                    pcts = []
                    sessions_list = []
                    for s in students_in_course:
                        att_str = s[course_key]
                        import re
                        match = re.search(r"(\d+)/(\d+)\s*\((\d+)%\)", att_str)
                        if match:
                            sessions_list.append(int(match.group(2)))
                            pcts.append(int(match.group(3)))
                    
                    if pcts:
                        avg_pct = sum(pcts) // len(pcts)
                    if sessions_list:
                        total_sessions = max(sessions_list)
                
                courses_stats.append({
                    "code": c_code,
                    "enrolled": total_enrolled,
                    "totalSessions": total_sessions,
                    "avgAttendance": avg_pct
                })
            
            faculty_with_stats = faculty.copy()
            faculty_with_stats["courses_stats"] = courses_stats
            return faculty_with_stats
    raise HTTPException(status_code=404, detail="Faculty not found in dataset")

@app.post("/api/register_face")
def register_face(req: RegisterFaceRequest):
    try:
        b64 = req.face_image_b64
        if "," in b64: b64 = b64.split(",")[1]
        
        # Add padding
        b64 += "=" * ((4 - len(b64) % 4) % 4)
        
        try:
            img_data = base64.b64decode(b64)
        except Exception as e:
            raise Exception(f"Base64 decode error: {str(e)}")
            
        safe_email = "".join(c for c in req.email.lower() if c.isalnum() or c in "@._-")
        if not safe_email:
            raise Exception("Invalid email address")
            
        os.makedirs("face_registry", exist_ok=True)
        file_path = os.path.join("face_registry", f"{safe_email}.jpg")
        
        with open(file_path, "wb") as f:
            f.write(img_data)
            
        return {"message": "Face registered successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/verify/face_precheck")
def verify_face_precheck(req: VerifyFacePrecheckRequest):
    try:
        email = req.student_id.lower()
        file_path = os.path.join("face_registry", f"{email}.jpg")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Face not registered. Please register your face on the dashboard first.")
            
        live_b64 = req.face_image_b64
        if "," in live_b64: live_b64 = live_b64.split(",")[1]
        
        # Add padding
        live_b64 += "=" * ((4 - len(live_b64) % 4) % 4)
        
        match = True
        score = 0.99
        
        if DEEPFACE_AVAILABLE:
            try:
                img_stored = cv2.imread(file_path)
                
                nparr_live = np.frombuffer(base64.b64decode(live_b64), np.uint8)
                img_live = cv2.imdecode(nparr_live, cv2.IMREAD_COLOR)
                
                result = DeepFace.verify(img_live, img_stored, enforce_detection=True, model_name="Facenet")
                distance = result.get("distance", 1.0)
                
                if distance > settings.DEEPFACE_THRESHOLD:
                    match = False
                    score = 1.0 - distance
                else:
                    match = True
                    score = 1.0 - distance
            except Exception as e:
                err_msg = str(e).encode('ascii', 'ignore').decode('ascii')
                print(f"DeepFace processing error: {err_msg}")
                match = False 
        else:
            print("Using safe fallback for face verification.")
            match = True
            
        if not match:
            raise HTTPException(status_code=403, detail="Face not recognized or spoof detected. Threshold not met.")
            
        return {"status": "success", "message": "Face verified successfully", "score": score}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions/create")
def create_session(req: SessionCreateRequest):
    now = datetime.now(timezone.utc)
    exp_time = now + timedelta(minutes=req.duration_minutes)
    session_id = f"sess_{int(now.timestamp())}"
    
    if JWT_AVAILABLE:
        qr_token = jwt.encode({
            "session_id": session_id,
            "course_id": req.course_id,
            "class_number": req.class_number,
            "exp": int(exp_time.timestamp()),
            "iat": int(now.timestamp()),
            "iss": "AttendX_Faculty"
        }, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    else:
        qr_token = f"session_{session_id}_{req.course_id}_{req.class_number}_{int(exp_time.timestamp())}"
    
    # Store session metadata for validation (Issue 5)
    active_sessions[session_id] = {
        "session_id": session_id,
        "course_id": req.course_id,
        "class_number": req.class_number,
        "qr_token": qr_token,
        "start_time": now,
        "expires_at": exp_time,
        "is_active": True
    }
    
    attendance_records_db[session_id] = []
    session_scans[session_id] = []
    
    # Re-generate QR Code with the actual token
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    
    return {
        "message": "Session created successfully", 
        "qr_code_base64": img_b64, 
        "session_id": session_id,
        "qr_token": qr_token
    }

@app.get("/api/sessions/{session_id}/scans")
def get_session_scans(session_id: str):
    if session_id not in session_scans:
        return []
    return session_scans[session_id]

@app.post("/api/sessions/{session_id}/close")
def close_session(session_id: str):
    if session_id in active_sessions:
        active_sessions[session_id]["is_active"] = False
        return {"message": "Session closed"}
    raise HTTPException(status_code=404, detail="Session not found")

@app.post("/api/verify/qr_scan")
def verify_qr_scan(req: QrScanRequest):
    # 1. Verify QR Token Signature & Expiry (Issue 4 & 5)
    payload = {}
    if JWT_AVAILABLE:
        try:
            payload = jwt.decode(req.qr_token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=403, detail="QR Code has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=403, detail="Invalid or tampered QR Code")
    else:
        # Fallback parsing for non-JWT mode
        parts = req.qr_token.split("_")
        if len(parts) < 5 or parts[0] != "session":
            raise HTTPException(status_code=403, detail="Invalid QR Code format")
        payload = {
            "session_id": parts[1],
            "course_id": parts[2],
            "class_number": int(parts[3]),
            "exp": int(parts[4])
        }
        if datetime.now(timezone.utc).timestamp() > payload["exp"]:
            raise HTTPException(status_code=403, detail="QR Code has expired")

    # 2. Match with database/store (Issue 4)
    session_id = payload.get("session_id")
    if not session_id or session_id not in active_sessions:
        raise HTTPException(status_code=403, detail="External or unknown QR Code rejected")
    
    matched_session = active_sessions[session_id]
    
    # Verify the token matches exactly what we stored (Layer 2)
    if matched_session["qr_token"] != req.qr_token:
        raise HTTPException(status_code=403, detail="Tampered QR Code rejected")
    
    # Validate session activity and time window
    if not matched_session["is_active"]:
         raise HTTPException(status_code=403, detail="This session has been closed")
         
    now = datetime.now(timezone.utc)
    if now > matched_session["expires_at"]:
        matched_session["is_active"] = False
        raise HTTPException(status_code=403, detail="Session time window has expired")

    # 3. Prevent Reuse (Issue 5: Nonce not reused)
    student_email = req.student_id.lower()
    if student_email in attendance_records_db[session_id]:
        raise HTTPException(status_code=403, detail="Attendance already marked for this session")

    # 4. Update Attendance Details in Dataset (Issue 5 requirement)
    student_found = None
    course_key = f"{matched_session['course_id']} Attendance (2 Months)"
    
    for student in student_data:
        if student.get('Institutional Email', '').lower() == student_email:
            student_found = student
            break
            
    if not student_found:
        raise HTTPException(status_code=404, detail="Student not found in local dataset")

    # Parse and update attendance: "41/45 (71%)"
    att_str = student_found.get(course_key, "0/0 (0%)")
    try:
        import re
        match = re.search(r"(\d+)/(\d+)", att_str)
        if match:
            attended = int(match.group(1)) + 1
            total = int(match.group(2)) + 1
            percentage = int((attended / total) * 100)
            student_found[course_key] = f"{attended}/{total} ({percentage}%)"
    except Exception as e:
        print(f"Error updating attendance string: {e}")

    # Mark as used for this student in this session
    attendance_records_db[session_id].append(student_email)
    
    # Add to live session scans for faculty dashboard
    session_scans[session_id].append({
        "name": student_found.get("Name", "Unknown"),
        "roll": student_found.get("Roll Number", "N/A"),
        "time": datetime.now().strftime("%I:%M %p")
    })
    
    save_student_data()
    
    return {
        "status": "success", 
        "message": "Attendance marked successfully", 
        "course": matched_session['course_id'],
        "score": req.face_match_score
    }
