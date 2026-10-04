"""
MediCare 2.0 - Complete Demo Data Seed Script
Idempotent script to seed 60 Doctors, 5 Receptionists, 20 Patients, Schedules & 16 Appointments.
"""

import os
import sys
from datetime import date, time, datetime, timedelta

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.enums import UserRole, Gender, AppointmentStatus, PaymentStatus
from app.models.department import Department
from app.models.doctor import Doctor
from app.models.schedule import DoctorSchedule
from app.models.patient import Patient
from app.models.appointment import Appointment

COMMON_PASSWORD = "Medicare@123"

# 30 Real Medical Departments in order
REAL_DEPARTMENTS = [
    "Cardiology",
    "Neurology & Brain Sciences",
    "Orthopedics",
    "Pediatrics",
    "Dermatology",
    "General Medicine",
    "General Surgery",
    "Gynecology & Obstetrics",
    "ENT (Ear, Nose & Throat)",
    "Ophthalmology",
    "Psychiatry",
    "Pulmonology",
    "Gastroenterology",
    "Nephrology",
    "Urology",
    "Oncology",
    "Endocrinology",
    "Radiology",
    "Dentistry",
    "Emergency Medicine",
    "Anesthesiology",
    "Pathology",
    "Physiotherapy & Rehabilitation",
    "Rheumatology",
    "Neurosurgery",
    "Cardiothoracic Surgery",
    "Vascular Surgery",
    "Plastic & Reconstructive Surgery",
    "Infectious Diseases",
    "Internal Medicine",
]

DOCTOR_PHOTO_MAP = {
    "dr.rajesh.sharma@medicare.demo": "/uploads/doctors/doc_male_1_2f16d806.jpg",
    "dr.ananya.sen@medicare.demo": "/uploads/doctors/doc_male_2_be0df4b9.jpg",
    "dr.vikramaditya.rao@medicare.demo": "/uploads/doctors/doc_male_3_06cbcbc7.jpg",
    "dr.sunita.patel@medicare.demo": "/uploads/doctors/doc_female_1_33ffa569.jpg",
    "dr.amitabha.mukherji@medicare.demo": "/uploads/doctors/doc_male_4_bb3cf51c.jpg",
    "dr.priya.deshmukh@medicare.demo": "/uploads/doctors/doc_female_2_3f83e72e.jpg",
    "dr.suresh.kulkarni@medicare.demo": "/uploads/doctors/doc_male_5_dc8db5df.jpg",
    "dr.kavita.reddy@medicare.demo": "/uploads/doctors/doc_female_3_633c9dbe.jpg",
    "dr.arvind.swaminathan@medicare.demo": "/uploads/doctors/doc_male_6_1d4e74a4.jpg",
    "dr.meenakshi.sundaram@medicare.demo": "/uploads/doctors/doc_female_4_649ee1d9.jpg",
    "dr.ramesh.gupta@medicare.demo": "/uploads/doctors/doc_male_7_d6ffdde8.jpg",
    "dr.shalini.bhatnagar@medicare.demo": "/uploads/doctors/doc_female_5_cc033691.jpg",
    "dr.alok.verma@medicare.demo": "/uploads/doctors/doc_male_8_a85c2d1a.jpg",
    "dr.harish.prasad@medicare.demo": "/uploads/doctors/doc_male_9_eb0d7ce7.jpg",
    "dr.nitin.joshi@medicare.demo": "/uploads/doctors/doc_male_10_ecb6c95a.jpg",
    "dr.siddharth.malhotra@medicare.demo": "/uploads/doctors/doc_male_11_17ca5b17.jpg",
    "dr.manoj.choudhary@medicare.demo": "/uploads/doctors/doc_male_12_8001efd4.jpg",
    "dr.tarun.agarwal@medicare.demo": "/uploads/doctors/doc_male_13_b12129e6.jpg",
    "dr.bhaskar.roy@medicare.demo": "/uploads/doctors/doc_male_14_dba6f279.jpg",
    "dr.vijay.sethi@medicare.demo": "/uploads/doctors/doc_male_15_33b21793.jpg",
    "dr.devendra.shrivastava@medicare.demo": "/uploads/doctors/doc_male_16_ffd15d4c.jpg",
    "dr.rajiv.singh@medicare.demo": "/uploads/doctors/doc_male_17_0a78ec3e.jpg",
    "dr.kedar.tripathy@medicare.demo": "/uploads/doctors/doc_male_18_568c2730.jpg",
    "dr.pankaj.kulkarni@medicare.demo": "/uploads/doctors/doc_male_19_1bd33ed5.jpg",
    "dr.girish.shetty@medicare.demo": "/uploads/doctors/doc_male_20_5e5788bc.jpg",
    "dr.sunil.mahapatra@medicare.demo": "/uploads/doctors/doc_male_21_cb73f967.jpg",
    "dr.nalinaksha.mitra@medicare.demo": "/uploads/doctors/doc_male_22_1fe489c3.jpg",
    "dr.ashish.deshpande@medicare.demo": "/uploads/doctors/doc_male_23_e0f736d9.jpg",
    "dr.mohan.jain@medicare.demo": "/uploads/doctors/doc_male_24_911da504.jpg",
    "dr.pradeep.sharma@medicare.demo": "/uploads/doctors/doc_male_25_cc4c2900.jpg",
    "dr.subhash.bose@medicare.demo": "/uploads/doctors/doc_male_26_451b6913.jpg",
    "dr.anand.vardhan@medicare.demo": "/uploads/doctors/doc_male_27_63a74653.jpg",
    "dr.hemant.chaudhari@medicare.demo": "/uploads/doctors/doc_male_28_49ba5df6.jpg",
    "dr.utpal.bhuyan@medicare.demo": "/uploads/doctors/doc_male_29_19b3cb26.jpg",
    "dr.biren.das@medicare.demo": "/uploads/doctors/doc_male_30_b77f5cd5.jpg",
    "dr.deepa.nambiar@medicare.demo": "/uploads/doctors/doc_female_6_0091160a.jpg",
    "dr.radhika.iyer@medicare.demo": "/uploads/doctors/doc_female_7_a67ab09b.jpg",
    "dr.pooja.saxena@medicare.demo": "/uploads/doctors/doc_female_8_98611765.jpg",
    "dr.divya.menon@medicare.demo": "/uploads/doctors/doc_female_9_ddeb5734.jpg",
    "dr.archana.hegde@medicare.demo": "/uploads/doctors/doc_female_10_1cb44b4b.jpg",
    "dr.neha.kapoor@medicare.demo": "/uploads/doctors/doc_female_11_a7720172.jpg",
    "dr.ritu.pillai@medicare.demo": "/uploads/doctors/doc_female_12_8ff6b781.jpg",
    "dr.smita.bannerjee@medicare.demo": "/uploads/doctors/doc_female_13_f9604645.jpg",
    "dr.vandana.mohan@medicare.demo": "/uploads/doctors/doc_female_14_436f62dd.jpg",
    "dr.swati.nair@medicare.demo": "/uploads/doctors/doc_female_15_d79606ca.jpg",
    "dr.anupama.bhattacharya@medicare.demo": "/uploads/doctors/doc_female_16_fe3b8961.jpg",
    "dr.shilpa.rao@medicare.demo": "/uploads/doctors/doc_female_17_976f02b2.jpg",
    "dr.sunayana.das@medicare.demo": "/uploads/doctors/doc_female_18_5375e764.jpg",
    "dr.tanvi.chawla@medicare.demo": "/uploads/doctors/doc_female_19_2511866e.jpg",
    "dr.leena.thomas@medicare.demo": "/uploads/doctors/doc_female_20_74d8f375.jpg",
    "dr.pallavi.kulkarni@medicare.demo": "/uploads/doctors/doc_female_21_60ce0ab1.jpg",
    "dr.gayatri.saxena@medicare.demo": "/uploads/doctors/doc_female_22_4854ba14.jpg",
    "dr.sarika.pandey@medicare.demo": "/uploads/doctors/doc_female_23_dbd48cb5.jpg",
    "dr.jyoti.malhotra@medicare.demo": "/uploads/doctors/doc_female_24_ad6a3b5d.jpg",
    "dr.reena.dsouza@medicare.demo": "/uploads/doctors/doc_female_25_71e8c3e4.jpg",
    "dr.madhuri.shastri@medicare.demo": "/uploads/doctors/doc_female_26_026475e0.jpg",
    "dr.nishi.gupta@medicare.demo": "/uploads/doctors/doc_female_27_aa5ae337.jpg",
    "dr.sangeeta.rao@medicare.demo": "/uploads/doctors/doc_female_28_4b680f51.jpg",
    "dr.archana.kulkarni@medicare.demo": "/uploads/doctors/doc_female_29_87c19fec.jpg",
    "dr.sonali.sengupta@medicare.demo": "/uploads/doctors/doc_female_30_6f2bb7e5.jpg",
}

DOCTORS_DATA = [
    # Department 1: Cardiology
    {
        "dept": "Cardiology",
        "full_name": "Dr. Rajesh Sharma",
        "email": "dr.rajesh.sharma@medicare.demo",
        "phone": "9810010001",
        "reg_no": "MCI-2026-001",
        "specialty": "Cardiology",
        "qualification": "MBBS, MD, DM (Cardiology)",
        "experience": 16,
        "fee": 1200.0,
        "room_no": "OPD-101",
        "bio": "Senior Interventional Cardiologist with expertise in coronary angiography, angioplasty, and cardiac intensive care.",
        "leave_days": [],
    },
    {
        "dept": "Cardiology",
        "full_name": "Dr. Ananya Sen",
        "email": "dr.ananya.sen@medicare.demo",
        "phone": "9810010002",
        "reg_no": "MCI-2026-002",
        "specialty": "Non-Invasive Cardiology",
        "qualification": "MBBS, MD (Medicine), DNB (Cardiology)",
        "experience": 9,
        "fee": 900.0,
        "room_no": "OPD-102",
        "bio": "Specialist in echocardiography, stress testing, preventive cardiology, and heart failure management.",
        "leave_days": [],
    },
    # Department 2: Neurology & Brain Sciences
    {
        "dept": "Neurology & Brain Sciences",
        "full_name": "Dr. Vikramaditya Rao",
        "email": "dr.vikramaditya.rao@medicare.demo",
        "phone": "9810010003",
        "reg_no": "MCI-2026-003",
        "specialty": "Clinical Neurology",
        "qualification": "MBBS, MD, DM (Neurology)",
        "experience": 14,
        "fee": 1100.0,
        "room_no": "OPD-103",
        "bio": "Senior Neurologist specializing in stroke management, epilepsy disorders, and movement disorders.",
        "leave_days": ["Wednesday"],
    },
    {
        "dept": "Neurology & Brain Sciences",
        "full_name": "Dr. Sunita Patel",
        "email": "dr.sunita.patel@medicare.demo",
        "phone": "9810010004",
        "reg_no": "MCI-2026-004",
        "specialty": "Neurophysiology",
        "qualification": "MBBS, DNB (Neurology)",
        "experience": 7,
        "fee": 850.0,
        "room_no": "OPD-104",
        "bio": "Expert in nerve conduction studies, electromyography, neuromuscular diseases, and chronic migraine care.",
        "leave_days": [],
    },
    # Department 3: Orthopedics
    {
        "dept": "Orthopedics",
        "full_name": "Dr. Amitabha Mukherji",
        "email": "dr.amitabha.mukherji@medicare.demo",
        "phone": "9810010005",
        "reg_no": "MCI-2026-005",
        "specialty": "Joint Replacement & Orthopedics",
        "qualification": "MBBS, MS (Orthopedics), MCh",
        "experience": 18,
        "fee": 1250.0,
        "room_no": "OPD-105",
        "bio": "Renowned orthopedic surgeon with over 2,000 successful total knee and hip replacement surgeries.",
        "leave_days": [],
    },
    {
        "dept": "Orthopedics",
        "full_name": "Dr. Priya Deshmukh",
        "email": "dr.priya.deshmukh@medicare.demo",
        "phone": "9810010006",
        "reg_no": "MCI-2026-006",
        "specialty": "Sports Medicine & Trauma",
        "qualification": "MBBS, MS (Orthopedics), Fellowship Sports Med",
        "experience": 8,
        "fee": 800.0,
        "room_no": "OPD-106",
        "bio": "Arthroscopy specialist focusing on ligament reconstruction, shoulder injuries, and sports trauma rehabilitation.",
        "leave_days": [],
    },
    # Department 4: Pediatrics
    {
        "dept": "Pediatrics",
        "full_name": "Dr. Suresh Kulkarni",
        "email": "dr.suresh.kulkarni@medicare.demo",
        "phone": "9810010007",
        "reg_no": "MCI-2026-007",
        "specialty": "General Pediatrics",
        "qualification": "MBBS, MD (Pediatrics), DCH",
        "experience": 15,
        "fee": 700.0,
        "room_no": "OPD-107",
        "bio": "Compassionate pediatrician with extensive experience in child growth monitoring, vaccinations, and pediatric infections.",
        "leave_days": ["Friday"],
    },
    {
        "dept": "Pediatrics",
        "full_name": "Dr. Kavita Reddy",
        "email": "dr.kavita.reddy@medicare.demo",
        "phone": "9810010008",
        "reg_no": "MCI-2026-008",
        "specialty": "Neonatology & Pediatric Care",
        "qualification": "MBBS, MD (Pediatrics), Fellowship Neonatology",
        "experience": 10,
        "fee": 850.0,
        "room_no": "OPD-108",
        "bio": "Neonatologist specializing in premature baby care, neonatal ICU care, and infant nutrition.",
        "leave_days": [],
    },
    # Department 5: Dermatology
    {
        "dept": "Dermatology",
        "full_name": "Dr. Arvind Swaminathan",
        "email": "dr.arvind.swaminathan@medicare.demo",
        "phone": "9810010009",
        "reg_no": "MCI-2026-009",
        "specialty": "Dermatology & Cosmetology",
        "qualification": "MBBS, MD (Dermatology)",
        "experience": 11,
        "fee": 900.0,
        "room_no": "OPD-109",
        "bio": "Dermatologist expert in clinical dermatology, psoriasis, eczema, acne management, and laser treatments.",
        "leave_days": [],
    },
    {
        "dept": "Dermatology",
        "full_name": "Dr. Meenakshi Sundaram",
        "email": "dr.meenakshi.sundaram@medicare.demo",
        "phone": "9810010010",
        "reg_no": "MCI-2026-010",
        "specialty": "Pediatric Dermatology",
        "qualification": "MBBS, DVD, DNB (Dermatology)",
        "experience": 6,
        "fee": 750.0,
        "room_no": "OPD-110",
        "bio": "Specialist in childhood skin conditions, hair disorders, and pediatric allergic dermatoses.",
        "leave_days": [],
    },
    # Department 6: General Medicine
    {
        "dept": "General Medicine",
        "full_name": "Dr. Ramesh Chandra Gupta",
        "email": "dr.ramesh.gupta@medicare.demo",
        "phone": "9810010011",
        "reg_no": "MCI-2026-011",
        "specialty": "Internal Medicine",
        "qualification": "MBBS, MD (General Medicine)",
        "experience": 20,
        "fee": 800.0,
        "room_no": "OPD-201",
        "bio": "Veteran physician with 20+ years of experience in chronic disease management, fever investigations, and adult immunizations.",
        "leave_days": ["Tuesday"],
    },
    {
        "dept": "General Medicine",
        "full_name": "Dr. Shalini Bhatnagar",
        "email": "dr.shalini.bhatnagar@medicare.demo",
        "phone": "9810010012",
        "reg_no": "MCI-2026-012",
        "specialty": "Lifestyle Diseases & Internal Medicine",
        "qualification": "MBBS, DNB (General Medicine)",
        "experience": 9,
        "fee": 650.0,
        "room_no": "OPD-202",
        "bio": "Focuses on hypertension, diabetes management, metabolic syndromes, and geriatric health.",
        "leave_days": [],
    },
    # Department 7: General Surgery
    {
        "dept": "General Surgery",
        "full_name": "Dr. Alok Kumar Verma",
        "email": "dr.alok.verma@medicare.demo",
        "phone": "9810010013",
        "reg_no": "MCI-2026-013",
        "specialty": "Laparoscopic & General Surgery",
        "qualification": "MBBS, MS (General Surgery), FMAS",
        "experience": 17,
        "fee": 1000.0,
        "room_no": "OPD-203",
        "bio": "Senior Surgeon skilled in minimally invasive laparoscopic cholecystectomy, hernia repairs, and appendectomy.",
        "leave_days": [],
    },
    {
        "dept": "General Surgery",
        "full_name": "Dr. Deepa Nambiar",
        "email": "dr.deepa.nambiar@medicare.demo",
        "phone": "9810010014",
        "reg_no": "MCI-2026-014",
        "specialty": "GI & Breast Surgery",
        "qualification": "MBBS, MS (General Surgery)",
        "experience": 8,
        "fee": 800.0,
        "room_no": "OPD-204",
        "bio": "General surgeon with special interest in breast health procedures, wound care, and emergency abdominal surgeries.",
        "leave_days": [],
    },
    # Department 8: Gynecology & Obstetrics
    {
        "dept": "Gynecology & Obstetrics",
        "full_name": "Dr. Radhika Iyer",
        "email": "dr.radhika.iyer@medicare.demo",
        "phone": "9810010015",
        "reg_no": "MCI-2026-015",
        "specialty": "Obstetrics & High-Risk Pregnancy",
        "qualification": "MBBS, MD (Gynecology & Obstetrics), DGO",
        "experience": 16,
        "fee": 1000.0,
        "room_no": "OPD-205",
        "bio": "Senior Obstetrician managing high-risk pregnancies, normal deliveries, and antenatal counseling.",
        "leave_days": ["Thursday"],
    },
    {
        "dept": "Gynecology & Obstetrics",
        "full_name": "Dr. Pooja Saxena",
        "email": "dr.pooja.saxena@medicare.demo",
        "phone": "9810010016",
        "reg_no": "MCI-2026-016",
        "specialty": "Laparoscopic Gynecology",
        "qualification": "MBBS, MS (Obstetrics & Gynecology), Fellowship Laparoscopy",
        "experience": 10,
        "fee": 850.0,
        "room_no": "OPD-206",
        "bio": "Expert in minimally invasive gynecological surgeries, fibroid removal, and PCOD treatment.",
        "leave_days": [],
    },
    # Department 9: ENT (Ear, Nose & Throat)
    {
        "dept": "ENT (Ear, Nose & Throat)",
        "full_name": "Dr. Harish Prasad",
        "email": "dr.harish.prasad@medicare.demo",
        "phone": "9810010017",
        "reg_no": "MCI-2026-017",
        "specialty": "Otorhinolaryngology (ENT)",
        "qualification": "MBBS, MS (ENT), DLO",
        "experience": 13,
        "fee": 750.0,
        "room_no": "OPD-207",
        "bio": "Specialist in sinus surgery (FESS), tympanoplasty, tonsillectomy, and voice disorders.",
        "leave_days": [],
    },
    {
        "dept": "ENT (Ear, Nose & Throat)",
        "full_name": "Dr. Divya Menon",
        "email": "dr.divya.menon@medicare.demo",
        "phone": "9810010018",
        "reg_no": "MCI-2026-018",
        "specialty": "Otology & Vertigo Clinic",
        "qualification": "MBBS, DNB (ENT)",
        "experience": 7,
        "fee": 650.0,
        "room_no": "OPD-208",
        "bio": "Specializes in hearing loss evaluation, vertigo disorders, and pediatric ENT conditions.",
        "leave_days": [],
    },
    # Department 10: Ophthalmology
    {
        "dept": "Ophthalmology",
        "full_name": "Dr. Nitin Joshi",
        "email": "dr.nitin.joshi@medicare.demo",
        "phone": "9810010019",
        "reg_no": "MCI-2026-019",
        "specialty": "Cataract & Refractive Surgery",
        "qualification": "MBBS, MS (Ophthalmology), FICO",
        "experience": 15,
        "fee": 850.0,
        "room_no": "OPD-209",
        "bio": "Micro-incision phacoemulsification surgeon expert in premium IOL implants and LASIK evaluation.",
        "leave_days": ["Monday"],
    },
    {
        "dept": "Ophthalmology",
        "full_name": "Dr. Archana Hegde",
        "email": "dr.archana.hegde@medicare.demo",
        "phone": "9810010020",
        "reg_no": "MCI-2026-020",
        "specialty": "Retina & Glaucoma",
        "qualification": "MBBS, DO, DNB (Ophthalmology)",
        "experience": 9,
        "fee": 750.0,
        "room_no": "OPD-210",
        "bio": "Vitreoretinal specialist caring for diabetic retinopathy, macular disorders, and glaucoma screening.",
        "leave_days": [],
    },
    # Department 11: Psychiatry
    {
        "dept": "Psychiatry",
        "full_name": "Dr. Siddharth Malhotra",
        "email": "dr.siddharth.malhotra@medicare.demo",
        "phone": "9810010021",
        "reg_no": "MCI-2026-021",
        "specialty": "Adult & General Psychiatry",
        "qualification": "MBBS, MD (Psychiatry)",
        "experience": 12,
        "fee": 1000.0,
        "room_no": "OPD-301",
        "bio": "Psychiatrist dealing with depression, anxiety disorders, bipolar affective disorder, and OCD care.",
        "leave_days": [],
    },
    {
        "dept": "Psychiatry",
        "full_name": "Dr. Neha Kapoor",
        "email": "dr.neha.kapoor@medicare.demo",
        "phone": "9810010022",
        "reg_no": "MCI-2026-022",
        "specialty": "Child & Adolescent Psychiatry",
        "qualification": "MBBS, DPM, DNB (Psychiatry)",
        "experience": 7,
        "fee": 850.0,
        "room_no": "OPD-302",
        "bio": "Specializing in ADHD, autism spectrum counseling, adolescent mental health, and stress management.",
        "leave_days": [],
    },
    # Department 12: Pulmonology
    {
        "dept": "Pulmonology",
        "full_name": "Dr. Manoj Kumar Choudhary",
        "email": "dr.manoj.choudhary@medicare.demo",
        "phone": "9810010023",
        "reg_no": "MCI-2026-023",
        "specialty": "Pulmonology & Chest Medicine",
        "qualification": "MBBS, MD (Chest Diseases), DTCD",
        "experience": 14,
        "fee": 900.0,
        "room_no": "OPD-303",
        "bio": "Pulmonologist expert in asthma, COPD, pulmonary fibrosis, bronchoscopy, and sleep apnea treatment.",
        "leave_days": ["Wednesday"],
    },
    {
        "dept": "Pulmonology",
        "full_name": "Dr. Ritu Pillai",
        "email": "dr.ritu.pillai@medicare.demo",
        "phone": "9810010024",
        "reg_no": "MCI-2026-024",
        "specialty": "Critical Care & Respiratory Medicine",
        "qualification": "MBBS, DNB (Pulmonary Medicine)",
        "experience": 8,
        "fee": 750.0,
        "room_no": "OPD-304",
        "bio": "Focuses on respiratory infections, post-COVID lung recovery, and sleep disorder studies.",
        "leave_days": [],
    },
    # Department 13: Gastroenterology
    {
        "dept": "Gastroenterology",
        "full_name": "Dr. Tarun Agarwal",
        "email": "dr.tarun.agarwal@medicare.demo",
        "phone": "9810010025",
        "reg_no": "MCI-2026-025",
        "specialty": "Medical Gastroenterology",
        "qualification": "MBBS, MD, DM (Gastroenterology)",
        "experience": 13,
        "fee": 1100.0,
        "room_no": "OPD-305",
        "bio": "Expert diagnostic and therapeutic endoscopist specializing in GERD, fatty liver, IBS, and peptic ulcers.",
        "leave_days": [],
    },
    {
        "dept": "Gastroenterology",
        "full_name": "Dr. Smita Bannerjee",
        "email": "dr.smita.bannerjee@medicare.demo",
        "phone": "9810010026",
        "reg_no": "MCI-2026-026",
        "specialty": "Hepatology & Clinical GI",
        "qualification": "MBBS, DNB (Gastroenterology)",
        "experience": 8,
        "fee": 900.0,
        "room_no": "OPD-306",
        "bio": "Special interest in chronic liver disease, hepatitis B & C care, and inflammatory bowel diseases (IBD).",
        "leave_days": [],
    },
    # Department 14: Nephrology
    {
        "dept": "Nephrology",
        "full_name": "Dr. Bhaskar Roy",
        "email": "dr.bhaskar.roy@medicare.demo",
        "phone": "9810010027",
        "reg_no": "MCI-2026-027",
        "specialty": "Nephrology & Renal Care",
        "qualification": "MBBS, MD, DM (Nephrology)",
        "experience": 16,
        "fee": 1150.0,
        "room_no": "OPD-307",
        "bio": "Nephrologist specializing in chronic kidney disease (CKD), hemodialysis management, and kidney transplants.",
        "leave_days": ["Friday"],
    },
    {
        "dept": "Nephrology",
        "full_name": "Dr. Vandana Mohan",
        "email": "dr.vandana.mohan@medicare.demo",
        "phone": "9810010028",
        "reg_no": "MCI-2026-028",
        "specialty": "Dialysis & Hypertension",
        "qualification": "MBBS, DNB (Nephrology)",
        "experience": 9,
        "fee": 850.0,
        "room_no": "OPD-308",
        "bio": "Focuses on diabetic nephropathy, glomerulonephritis, fluid-electrolyte imbalances, and outpatient dialysis.",
        "leave_days": [],
    },
    # Department 15: Urology
    {
        "dept": "Urology",
        "full_name": "Dr. Vijay Kumar Sethi",
        "email": "dr.vijay.sethi@medicare.demo",
        "phone": "9810010029",
        "reg_no": "MCI-2026-029",
        "specialty": "Endourology & Reconstructive Urology",
        "qualification": "MBBS, MS (Surgery), MCh (Urology)",
        "experience": 17,
        "fee": 1200.0,
        "room_no": "OPD-309",
        "bio": "Urologist proficient in kidney stone laser lithotripsy (RIRS/URSL), prostate surgery (TURP), and laparoscopic urology.",
        "leave_days": [],
    },
    {
        "dept": "Urology",
        "full_name": "Dr. Swati Nair",
        "email": "dr.swati.nair@medicare.demo",
        "phone": "9810010030",
        "reg_no": "MCI-2026-030",
        "specialty": "Female & Neurourology",
        "qualification": "MBBS, MS, DNB (Urology)",
        "experience": 8,
        "fee": 900.0,
        "room_no": "OPD-310",
        "bio": "Specialist in urinary incontinence, recurrent UTIs, neurogenic bladder, and urological ultrasound.",
        "leave_days": [],
    },
    # Department 16: Oncology
    {
        "dept": "Oncology",
        "full_name": "Dr. Devendra Nath Shrivastava",
        "email": "dr.devendra.shrivastava@medicare.demo",
        "phone": "9810010031",
        "reg_no": "MCI-2026-031",
        "specialty": "Medical Oncology",
        "qualification": "MBBS, MD (Medicine), DM (Oncology)",
        "experience": 15,
        "fee": 1300.0,
        "room_no": "OPD-401",
        "bio": "Senior Medical Oncologist managing chemotherapy regimens, targeted immunotherapy, and solid tumor protocols.",
        "leave_days": ["Tuesday", "Thursday"],
    },
    {
        "dept": "Oncology",
        "full_name": "Dr. Anupama Bhattacharya",
        "email": "dr.anupama.bhattacharya@medicare.demo",
        "phone": "9810010032",
        "reg_no": "MCI-2026-032",
        "specialty": "Hematology & Oncology",
        "qualification": "MBBS, DNB (Medical Oncology)",
        "experience": 9,
        "fee": 1000.0,
        "room_no": "OPD-402",
        "bio": "Expert in blood cancers (leukemia, lymphoma), anemia investigations, and supportive cancer care.",
        "leave_days": [],
    },
    # Department 17: Endocrinology
    {
        "dept": "Endocrinology",
        "full_name": "Dr. Rajiv Ranjan Singh",
        "email": "dr.rajiv.singh@medicare.demo",
        "phone": "9810010033",
        "reg_no": "MCI-2026-033",
        "specialty": "Diabetes & Endocrinology",
        "qualification": "MBBS, MD, DM (Endocrinology)",
        "experience": 14,
        "fee": 1050.0,
        "room_no": "OPD-403",
        "bio": "Endocrinologist focusing on type 1 and type 2 diabetes, thyroid disorders, and pituitary conditions.",
        "leave_days": [],
    },
    {
        "dept": "Endocrinology",
        "full_name": "Dr. Shilpa Rao",
        "email": "dr.shilpa.rao@medicare.demo",
        "phone": "9810010034",
        "reg_no": "MCI-2026-034",
        "specialty": "Pediatric & Reproductive Endocrinology",
        "qualification": "MBBS, DNB (Endocrinology)",
        "experience": 7,
        "fee": 850.0,
        "room_no": "OPD-404",
        "bio": "Specialist in PCOS, gestational diabetes, growth hormone therapy, and metabolic bone diseases.",
        "leave_days": [],
    },
    # Department 18: Radiology
    {
        "dept": "Radiology",
        "full_name": "Dr. Kedar Nath Tripathy",
        "email": "dr.kedar.tripathy@medicare.demo",
        "phone": "9810010035",
        "reg_no": "MCI-2026-035",
        "specialty": "Diagnostic Imaging & Interventional Radiology",
        "qualification": "MBBS, MD (Radiodiagnosis)",
        "experience": 16,
        "fee": 800.0,
        "room_no": "OPD-405",
        "bio": "Radiologist skilled in CT scan, MRI interpretation, Doppler ultrasound, and image-guided biopsies.",
        "leave_days": ["Wednesday"],
    },
    {
        "dept": "Radiology",
        "full_name": "Dr. Sunayana Das",
        "email": "dr.sunayana.das@medicare.demo",
        "phone": "9810010036",
        "reg_no": "MCI-2026-036",
        "specialty": "Musculoskeletal & Women Imaging",
        "qualification": "MBBS, DMRD, DNB (Radiology)",
        "experience": 10,
        "fee": 700.0,
        "room_no": "OPD-406",
        "bio": "Expert in digital mammography, fetal anomaly scans, MSK ultrasound, and X-ray diagnostics.",
        "leave_days": [],
    },
    # Department 19: Dentistry
    {
        "dept": "Dentistry",
        "full_name": "Dr. Pankaj Kulkarni",
        "email": "dr.pankaj.kulkarni@medicare.demo",
        "phone": "9810010037",
        "reg_no": "MCI-2026-037",
        "specialty": "Prosthodontics & Implantology",
        "qualification": "BDS, MDS (Prosthodontics)",
        "experience": 12,
        "fee": 600.0,
        "room_no": "OPD-407",
        "bio": "Dental surgeon specializing in dental implants, crown & bridge restorations, and full mouth rehabilitation.",
        "leave_days": [],
    },
    {
        "dept": "Dentistry",
        "full_name": "Dr. Tanvi Chawla",
        "email": "dr.tanvi.chawla@medicare.demo",
        "phone": "9810010038",
        "reg_no": "MCI-2026-038",
        "specialty": "Endodontics & Conservative Dentistry",
        "qualification": "BDS, MDS (Endodontics)",
        "experience": 7,
        "fee": 500.0,
        "room_no": "OPD-408",
        "bio": "Expert in painless root canal treatments (RCT), cosmetic tooth fillings, and teeth whitening.",
        "leave_days": [],
    },
    # Department 20: Emergency Medicine
    {
        "dept": "Emergency Medicine",
        "full_name": "Dr. Girish Kumar Shetty",
        "email": "dr.girish.shetty@medicare.demo",
        "phone": "9810010039",
        "reg_no": "MCI-2026-039",
        "specialty": "Emergency Medicine & Trauma Care",
        "qualification": "MBBS, MEM, DNB (Emergency Medicine)",
        "experience": 11,
        "fee": 800.0,
        "room_no": "ER-01",
        "bio": "Emergency physician managing acute trauma, cardiac arrest resuscitation, poisoning, and acute respiratory distress.",
        "leave_days": ["Friday"],
    },
    {
        "dept": "Emergency Medicine",
        "full_name": "Dr. Leena Thomas",
        "email": "dr.leena.thomas@medicare.demo",
        "phone": "9810010040",
        "reg_no": "MCI-2026-040",
        "specialty": "Triage & Acute Medical Care",
        "qualification": "MBBS, Dip. Emergency Med",
        "experience": 6,
        "fee": 650.0,
        "room_no": "ER-02",
        "bio": "Specializing in rapid triage, acute asthma exacerbation, emergency wound stabilization, and critical stabilization.",
        "leave_days": [],
    },
    # Department 21: Anesthesiology
    {
        "dept": "Anesthesiology",
        "full_name": "Dr. Sunil Kumar Mahapatra",
        "email": "dr.sunil.mahapatra@medicare.demo",
        "phone": "9810010041",
        "reg_no": "MCI-2026-041",
        "specialty": "Perioperative Anesthesia & Pain Medicine",
        "qualification": "MBBS, MD (Anesthesiology), DA",
        "experience": 15,
        "fee": 700.0,
        "room_no": "OT-Prep-1",
        "bio": "Senior Anesthesiologist expert in general, spinal, epidural anesthesia and postoperative acute pain management.",
        "leave_days": [],
    },
    {
        "dept": "Anesthesiology",
        "full_name": "Dr. Pallavi Kulkarni",
        "email": "dr.pallavi.kulkarni@medicare.demo",
        "phone": "9810010042",
        "reg_no": "MCI-2026-042",
        "specialty": "Pediatric & Obstetric Anesthesia",
        "qualification": "MBBS, DNB (Anesthesiology)",
        "experience": 8,
        "fee": 600.0,
        "room_no": "OT-Prep-2",
        "bio": "Anesthesiologist dedicated to labor analgesia (painless delivery), pediatric sedation, and nerve block techniques.",
        "leave_days": [],
    },
    # Department 22: Pathology
    {
        "dept": "Pathology",
        "full_name": "Dr. Nalinaksha Mitra",
        "email": "dr.nalinaksha.mitra@medicare.demo",
        "phone": "9810010043",
        "reg_no": "MCI-2026-043",
        "specialty": "Histopathology & Cytology",
        "qualification": "MBBS, MD (Pathology)",
        "experience": 17,
        "fee": 500.0,
        "room_no": "Lab-101",
        "bio": "Chief Pathologist supervising hematology, FNAC cytopathology, tumor biopsy evaluation, and quality assurance.",
        "leave_days": ["Monday"],
    },
    {
        "dept": "Pathology",
        "full_name": "Dr. Gayatri Saxena",
        "email": "dr.gayatri.saxena@medicare.demo",
        "phone": "9810010044",
        "reg_no": "MCI-2026-044",
        "specialty": "Clinical Pathology & Biochemistry",
        "qualification": "MBBS, DCP, DNB (Pathology)",
        "experience": 9,
        "fee": 450.0,
        "room_no": "Lab-102",
        "bio": "Specialist in automated blood analyzers, hormonal assays, clinical chemistry, and infectious disease serology.",
        "leave_days": [],
    },
    # Department 23: Physiotherapy & Rehabilitation
    {
        "dept": "Physiotherapy & Rehabilitation",
        "full_name": "Dr. Ashish Deshpande",
        "email": "dr.ashish.deshpande@medicare.demo",
        "phone": "9810010045",
        "reg_no": "MCI-2026-045",
        "specialty": "Orthopedic & Sports Physiotherapy",
        "qualification": "BPT, MPT (Musculoskeletal)",
        "experience": 13,
        "fee": 600.0,
        "room_no": "Rehab-01",
        "bio": "Senior Physiotherapist expert in post-fracture rehabilitation, back pain relief, posture correction, and dry needling.",
        "leave_days": [],
    },
    {
        "dept": "Physiotherapy & Rehabilitation",
        "full_name": "Dr. Sarika Pandey",
        "email": "dr.sarika.pandey@medicare.demo",
        "phone": "9810010046",
        "reg_no": "MCI-2026-046",
        "specialty": "Neurological & Pediatric Rehab",
        "qualification": "BPT, MPT (Neurosciences)",
        "experience": 7,
        "fee": 500.0,
        "room_no": "Rehab-02",
        "bio": "Rehabilitation therapist focusing on stroke recovery, spinal cord injury rehab, and cerebral palsy therapy.",
        "leave_days": [],
    },
    # Department 24: Rheumatology
    {
        "dept": "Rheumatology",
        "full_name": "Dr. Mohan Kumar Jain",
        "email": "dr.mohan.jain@medicare.demo",
        "phone": "9810010047",
        "reg_no": "MCI-2026-047",
        "specialty": "Clinical Rheumatology",
        "qualification": "MBBS, MD, DM (Clinical Immunology & Rheumatology)",
        "experience": 14,
        "fee": 1100.0,
        "room_no": "OPD-501",
        "bio": "Rheumatologist treating rheumatoid arthritis, ankylosing spondylitis, lupus (SLE), and gouty arthritis.",
        "leave_days": ["Wednesday"],
    },
    {
        "dept": "Rheumatology",
        "full_name": "Dr. Jyoti Malhotra",
        "email": "dr.jyoti.malhotra@medicare.demo",
        "phone": "9810010048",
        "reg_no": "MCI-2026-048",
        "specialty": "Autoimmune Diseases & Vasculitis",
        "qualification": "MBBS, DNB (Rheumatology)",
        "experience": 8,
        "fee": 850.0,
        "room_no": "OPD-502",
        "bio": "Expert in biological therapies, intra-articular injections, osteoporosis care, and connective tissue disorders.",
        "leave_days": [],
    },
    # Department 25: Neurosurgery
    {
        "dept": "Neurosurgery",
        "full_name": "Dr. Pradeep Sharma",
        "email": "dr.pradeep.sharma@medicare.demo",
        "phone": "9810010049",
        "reg_no": "MCI-2026-049",
        "specialty": "Brain & Spine Surgery",
        "qualification": "MBBS, MS (Surgery), MCh (Neurosurgery)",
        "experience": 18,
        "fee": 1500.0,
        "room_no": "OPD-503",
        "bio": "Senior Neurosurgeon expert in brain tumor excision, endoscopic spine surgery, and skull base surgery.",
        "leave_days": [],
    },
    {
        "dept": "Neurosurgery",
        "full_name": "Dr. Reena D'Souza",
        "email": "dr.reena.dsouza@medicare.demo",
        "phone": "9810010050",
        "reg_no": "MCI-2026-050",
        "specialty": "Minimally Invasive Spine Surgery",
        "qualification": "MBBS, DNB (Neurosurgery)",
        "experience": 10,
        "fee": 1200.0,
        "room_no": "OPD-504",
        "bio": "Neurosurgeon focusing on micro-discectomy, spinal fusion, neuro-trauma, and hydrocephalus management.",
        "leave_days": [],
    },
    # Department 26: Cardiothoracic Surgery
    {
        "dept": "Cardiothoracic Surgery",
        "full_name": "Dr. Subhash Chandra Bose",
        "email": "dr.subhash.bose@medicare.demo",
        "phone": "9810010051",
        "reg_no": "MCI-2026-051",
        "specialty": "Cardiac & Vascular Surgery",
        "qualification": "MBBS, MS, MCh (Cardiothoracic Surgery)",
        "experience": 19,
        "fee": 1500.0,
        "room_no": "OPD-505",
        "bio": "Veteran CTVS surgeon performing coronary artery bypass grafting (CABG), heart valve repair, and thoracic procedures.",
        "leave_days": ["Tuesday", "Thursday"],
    },
    {
        "dept": "Cardiothoracic Surgery",
        "full_name": "Dr. Madhuri Shastri",
        "email": "dr.madhuri.shastri@medicare.demo",
        "phone": "9810010052",
        "reg_no": "MCI-2026-052",
        "specialty": "Adult Cardiac Surgery",
        "qualification": "MBBS, DNB (CTVS)",
        "experience": 11,
        "fee": 1250.0,
        "room_no": "OPD-506",
        "bio": "Specializing in off-pump CABG, aortic aneurysm repair, and post-cardiac surgical ICU care.",
        "leave_days": [],
    },
    # Department 27: Vascular Surgery
    {
        "dept": "Vascular Surgery",
        "full_name": "Dr. Anand Vardhan",
        "email": "dr.anand.vardhan@medicare.demo",
        "phone": "9810010053",
        "reg_no": "MCI-2026-053",
        "specialty": "Endovascular & Peripheral Vascular Surgery",
        "qualification": "MBBS, MS (Surgery), MCh (Vascular Surgery)",
        "experience": 14,
        "fee": 1150.0,
        "room_no": "OPD-507",
        "bio": "Vascular surgeon expert in varicose vein laser ablation (EVLT), diabetic foot salvage, and arterial bypass.",
        "leave_days": [],
    },
    {
        "dept": "Vascular Surgery",
        "full_name": "Dr. Nishi Gupta",
        "email": "dr.nishi.gupta@medicare.demo",
        "phone": "9810010054",
        "reg_no": "MCI-2026-054",
        "specialty": "Venous & Dialysis Access Surgery",
        "qualification": "MBBS, DNB (Vascular Surgery)",
        "experience": 8,
        "fee": 900.0,
        "room_no": "OPD-508",
        "bio": "Focuses on AV fistula creation for hemodialysis, deep vein thrombosis (DVT) care, and peripheral Doppler evaluation.",
        "leave_days": [],
    },
    # Department 28: Plastic & Reconstructive Surgery
    {
        "dept": "Plastic & Reconstructive Surgery",
        "full_name": "Dr. Hemant Chaudhari",
        "email": "dr.hemant.chaudhari@medicare.demo",
        "phone": "9810010055",
        "reg_no": "MCI-2026-055",
        "specialty": "Reconstructive & Cosmetic Surgery",
        "qualification": "MBBS, MS (Surgery), MCh (Plastic Surgery)",
        "experience": 15,
        "fee": 1200.0,
        "room_no": "OPD-509",
        "bio": "Plastic surgeon expert in post-trauma tissue reconstruction, scar revision, microvascular surgery, and burn care.",
        "leave_days": ["Friday"],
    },
    {
        "dept": "Plastic & Reconstructive Surgery",
        "full_name": "Dr. Sangeeta Rao",
        "email": "dr.sangeeta.rao@medicare.demo",
        "phone": "9810010056",
        "reg_no": "MCI-2026-056",
        "specialty": "Maxillofacial & Aesthetic Surgery",
        "qualification": "MBBS, DNB (Plastic Surgery)",
        "experience": 9,
        "fee": 950.0,
        "room_no": "OPD-510",
        "bio": "Specializing in facial bone fracture repair, cleft lip surgery, aesthetic body contouring, and hand surgery.",
        "leave_days": [],
    },
    # Department 29: Infectious Diseases
    {
        "dept": "Infectious Diseases",
        "full_name": "Dr. Utpal Bhuyan",
        "email": "dr.utpal.bhuyan@medicare.demo",
        "phone": "9810010057",
        "reg_no": "MCI-2026-057",
        "specialty": "Clinical Infectious Diseases",
        "qualification": "MBBS, MD (Medicine), FNB (Infectious Diseases)",
        "experience": 13,
        "fee": 950.0,
        "room_no": "OPD-601",
        "bio": "Infectious Disease consultant dealing with tropical fevers, tuberculosis, drug-resistant bacterial infections, and HIV.",
        "leave_days": [],
    },
    {
        "dept": "Infectious Diseases",
        "full_name": "Dr. Archana Kulkarni",
        "email": "dr.archana.kulkarni@medicare.demo",
        "phone": "9810010058",
        "reg_no": "MCI-2026-058",
        "specialty": "Hospital Infection Control",
        "qualification": "MBBS, DNB (Infectious Diseases)",
        "experience": 7,
        "fee": 750.0,
        "room_no": "OPD-602",
        "bio": "Expert in antimicrobial stewardship, post-transplant infection prophylaxis, and travel medicine immunizations.",
        "leave_days": [],
    },
    # Department 30: Internal Medicine
    {
        "dept": "Internal Medicine",
        "full_name": "Dr. Biren Das",
        "email": "dr.biren.das@medicare.demo",
        "phone": "9810010059",
        "reg_no": "MCI-2026-059",
        "specialty": "General & Internal Medicine",
        "qualification": "MBBS, MD (Internal Medicine)",
        "experience": 16,
        "fee": 850.0,
        "room_no": "OPD-603",
        "bio": "Senior Consultant in internal medicine managing complex multi-system ailments, adult fever evaluation, and hypertension.",
        "leave_days": ["Wednesday"],
    },
    {
        "dept": "Internal Medicine",
        "full_name": "Dr. Sonali Sengupta",
        "email": "dr.sonali.sengupta@medicare.demo",
        "phone": "9810010060",
        "reg_no": "MCI-2026-060",
        "specialty": "Preventive Medicine & Health Check",
        "qualification": "MBBS, DNB (Internal Medicine)",
        "experience": 9,
        "fee": 700.0,
        "room_no": "OPD-604",
        "bio": "Physician specializing in annual executive health checkups, preventive screenings, and adult diabetes management.",
        "leave_days": [],
    },
]

RECEPTIONISTS_DATA = [
    {
        "full_name": "Priya Sharma",
        "email": "reception.priya@medicare.demo",
        "phone": "9820020001",
        "responsibility": "Front Desk Receptionist",
    },
    {
        "full_name": "Karan Verma",
        "email": "reception.karan@medicare.demo",
        "phone": "9820020002",
        "responsibility": "Appointment Coordinator",
    },
    {
        "full_name": "Deepika Patel",
        "email": "reception.deepika@medicare.demo",
        "phone": "9820020003",
        "responsibility": "OPD Receptionist",
    },
    {
        "full_name": "Vikram Singh",
        "email": "reception.vikram@medicare.demo",
        "phone": "9820020004",
        "responsibility": "Billing Executive",
    },
    {
        "full_name": "Sneha Mukherji",
        "email": "reception.sneha@medicare.demo",
        "phone": "9820020005",
        "responsibility": "Patient Services Coordinator",
    },
]

PATIENTS_DATA = [
    # 16 patients with appointments
    {
        "full_name": "Aarav Mehta",
        "email": "patient.aarav@medicare.demo",
        "phone": "9830030001",
        "gender": Gender.MALE,
        "dob": date(1990, 5, 14),
        "blood_group": "O+",
        "emergency_contact": "9830039901",
        "address": "Flat 402, Green Park, Mumbai",
        "allergies": "Penicillin",
        "dept_target": "Cardiology",
        "reason": "Chest tightness & routine ECG checkup",
    },
    {
        "full_name": "Diya Sharma",
        "email": "patient.diya@medicare.demo",
        "phone": "9830030002",
        "gender": Gender.FEMALE,
        "dob": date(1994, 8, 22),
        "blood_group": "A+",
        "emergency_contact": "9830039902",
        "address": "B-12, Sector 15, Noida",
        "allergies": "Sulfa drugs",
        "dept_target": "Neurology & Brain Sciences",
        "reason": "Persistent migraine and nerve tingling evaluation",
    },
    {
        "full_name": "Vivaan Kapoor",
        "email": "patient.vivaan@medicare.demo",
        "phone": "9830030003",
        "gender": Gender.MALE,
        "dob": date(1985, 12, 3),
        "blood_group": "B+",
        "emergency_contact": "9830039903",
        "address": "55 Park Street, Kolkata",
        "allergies": "None",
        "dept_target": "Orthopedics",
        "reason": "Right knee pain after jogging",
    },
    {
        "full_name": "Ananya Gupta",
        "email": "patient.ananya@medicare.demo",
        "phone": "9830030004",
        "gender": Gender.FEMALE,
        "dob": date(1998, 3, 19),
        "blood_group": "AB+",
        "emergency_contact": "9830039904",
        "address": "12 Jubilee Hills, Hyderabad",
        "allergies": "Dust & Pollen",
        "dept_target": "Pediatrics",
        "reason": "Child wellness consultation & vaccination",
    },
    {
        "full_name": "Aditya Iyer",
        "email": "patient.aditya@medicare.demo",
        "phone": "9830030005",
        "gender": Gender.MALE,
        "dob": date(1992, 11, 8),
        "blood_group": "O-",
        "emergency_contact": "9830039905",
        "address": "78 Indiranagar, Bengaluru",
        "allergies": "None",
        "dept_target": "Dermatology",
        "reason": "Skin rash and allergic eczema review",
    },
    {
        "full_name": "Isha Nair",
        "email": "patient.isha@medicare.demo",
        "phone": "9830030006",
        "gender": Gender.FEMALE,
        "dob": date(1988, 7, 29),
        "blood_group": "A-",
        "emergency_contact": "9830039906",
        "address": "45 MG Road, Kochi",
        "allergies": "Aspirin",
        "dept_target": "General Medicine",
        "reason": "Viral fever follow-up & routine blood work",
    },
    {
        "full_name": "Vihaan Reddy",
        "email": "patient.vihaan@medicare.demo",
        "phone": "9830030007",
        "gender": Gender.MALE,
        "dob": date(1978, 1, 15),
        "blood_group": "B-",
        "emergency_contact": "9830039907",
        "address": "23 Banjara Hills, Hyderabad",
        "allergies": "None",
        "dept_target": "General Surgery",
        "reason": "Abdominal hernia consultation",
    },
    {
        "full_name": "Sanya Malhotra",
        "email": "patient.sanya@medicare.demo",
        "phone": "9830030008",
        "gender": Gender.FEMALE,
        "dob": date(1996, 9, 12),
        "blood_group": "O+",
        "emergency_contact": "9830039908",
        "address": "89 Civil Lines, Jaipur",
        "allergies": "Latex",
        "dept_target": "Gynecology & Obstetrics",
        "reason": "Routine antenatal checkup",
    },
    {
        "full_name": "Kabir Joshi",
        "email": "patient.kabir@medicare.demo",
        "phone": "9830030009",
        "gender": Gender.MALE,
        "dob": date(2001, 4, 5),
        "blood_group": "A+",
        "emergency_contact": "9830039909",
        "address": "14 FC Road, Pune",
        "allergies": "None",
        "dept_target": "ENT (Ear, Nose & Throat)",
        "reason": "Sinus congestion & ear pain",
    },
    {
        "full_name": "Kiara Sen",
        "email": "patient.kiara@medicare.demo",
        "phone": "9830030010",
        "gender": Gender.FEMALE,
        "dob": date(1993, 6, 30),
        "blood_group": "AB-",
        "emergency_contact": "9830039910",
        "address": "67 Salt Lake, Kolkata",
        "allergies": "Shellfish",
        "dept_target": "Ophthalmology",
        "reason": "Vision checkup & new glasses prescription",
    },
    {
        "full_name": "Rohan Deshmukh",
        "email": "patient.rohan@medicare.demo",
        "phone": "9830030011",
        "gender": Gender.MALE,
        "dob": date(1982, 10, 17),
        "blood_group": "B+",
        "emergency_contact": "9830039911",
        "address": "34 Koregaon Park, Pune",
        "allergies": "None",
        "dept_target": "Pulmonology",
        "reason": "Chronic asthma management & PFT test",
    },
    {
        "full_name": "Tara Bhatia",
        "email": "patient.tara@medicare.demo",
        "phone": "9830030012",
        "gender": Gender.FEMALE,
        "dob": date(1997, 2, 14),
        "blood_group": "O+",
        "emergency_contact": "9830039912",
        "address": "90 Model Town, Delhi",
        "allergies": "Peanuts",
        "dept_target": "Gastroenterology",
        "reason": "Acidity & stomach ulcer evaluation",
    },
    {
        "full_name": "Arjun Saxena",
        "email": "patient.arjun@medicare.demo",
        "phone": "9830030013",
        "gender": Gender.MALE,
        "dob": date(1975, 8, 25),
        "blood_group": "A+",
        "emergency_contact": "9830039913",
        "address": "11 Aliganj, Lucknow",
        "allergies": "None",
        "dept_target": "Nephrology",
        "reason": "Kidney function test review & hypertension",
    },
    {
        "full_name": "Riya Pillai",
        "email": "patient.riya@medicare.demo",
        "phone": "9830030014",
        "gender": Gender.FEMALE,
        "dob": date(1999, 12, 10),
        "blood_group": "B+",
        "emergency_contact": "9830039914",
        "address": "88 RS Puram, Coimbatore",
        "allergies": "None",
        "dept_target": "Endocrinology",
        "reason": "Thyroid imbalance & hormone screening",
    },
    {
        "full_name": "Devansh Kulkarni",
        "email": "patient.devansh@medicare.demo",
        "phone": "9830030015",
        "gender": Gender.MALE,
        "dob": date(1989, 5, 2),
        "blood_group": "AB+",
        "emergency_contact": "9830039915",
        "address": "22 Sadashiv Peth, Pune",
        "allergies": "NSAIDs",
        "dept_target": "Dentistry",
        "reason": "Tooth cavity filling & dental cleaning",
    },
    {
        "full_name": "Meera Das",
        "email": "patient.meera@medicare.demo",
        "phone": "9830030016",
        "gender": Gender.FEMALE,
        "dob": date(1991, 7, 7),
        "blood_group": "O+",
        "emergency_contact": "9830039916",
        "address": "54 Saheed Nagar, Bhubaneswar",
        "allergies": "None",
        "dept_target": "Physiotherapy & Rehabilitation",
        "reason": "Lower back pain physiotherapy session",
    },
    # 4 patients WITHOUT appointments
    {
        "full_name": "Kavya Swaminathan",
        "email": "patient.kavya@medicare.demo",
        "phone": "9830030017",
        "gender": Gender.FEMALE,
        "dob": date(1995, 3, 28),
        "blood_group": "A+",
        "emergency_contact": "9830039917",
        "address": "10 Mylapore, Chennai",
        "allergies": "None",
        "dept_target": None,
        "reason": None,
    },
    {
        "full_name": "Reyansh Tripathi",
        "email": "patient.reyansh@medicare.demo",
        "phone": "9830030018",
        "gender": Gender.MALE,
        "dob": date(1987, 9, 14),
        "blood_group": "B+",
        "emergency_contact": "9830039918",
        "address": "77 Gomti Nagar, Lucknow",
        "allergies": "None",
        "dept_target": None,
        "reason": None,
    },
    {
        "full_name": "Nisha Chawla",
        "email": "patient.nisha@medicare.demo",
        "phone": "9830030019",
        "gender": Gender.FEMALE,
        "dob": date(2000, 11, 21),
        "blood_group": "O-",
        "emergency_contact": "9830039919",
        "address": "43 Sector 17, Chandigarh",
        "allergies": "None",
        "dept_target": None,
        "reason": None,
    },
    {
        "full_name": "Manav Pandey",
        "email": "patient.manav@medicare.demo",
        "phone": "9830030020",
        "gender": Gender.MALE,
        "dob": date(1980, 4, 18),
        "blood_group": "A-",
        "emergency_contact": "9830039920",
        "address": "15 Kankarbagh, Patna",
        "allergies": "None",
        "dept_target": None,
        "reason": None,
    },
]

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

def seed_demo_dataset(db: Session = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
    try:
        hashed_pw = get_password_hash(COMMON_PASSWORD)
        
        # -------------------------------------------------------------
        # 1. SEEDING RECEPTIONISTS (5 ACCOUNTS)
        # -------------------------------------------------------------
        print("=== 1. SEEDING RECEPTIONISTS (5 ACCOUNTS) ===")
        receptionist_emails = [r["email"] for r in RECEPTIONISTS_DATA]
        existing_users = {
            u.email: u for u in db.query(User).filter(User.email.in_(receptionist_emails)).all()
        }
        
        receptionist_users = []
        for r_data in RECEPTIONISTS_DATA:
            user = existing_users.get(r_data["email"])
            if not user:
                user = User(
                    email=r_data["email"],
                    hashed_password=hashed_pw,
                    full_name=r_data["full_name"],
                    phone=r_data["phone"],
                    role=UserRole.RECEPTIONIST,
                    is_active=True,
                )
                db.add(user)
                existing_users[r_data["email"]] = user
                print(f"Created Receptionist user: {r_data['full_name']} ({r_data['email']})")
            else:
                print(f"Receptionist user exists: {user.full_name} ({user.email})")
            receptionist_users.append(user)

        # Flush to populate user IDs in batch
        db.flush()

        # -------------------------------------------------------------
        # 2. SEEDING PATIENTS (20 ACCOUNTS)
        # -------------------------------------------------------------
        print("\n=== 2. SEEDING PATIENTS (20 ACCOUNTS) ===")
        patient_emails = [p["email"] for p in PATIENTS_DATA]
        existing_patient_users = {
            u.email: u for u in db.query(User).filter(User.email.in_(patient_emails)).all()
        }

        for p_data in PATIENTS_DATA:
            user = existing_patient_users.get(p_data["email"])
            if not user:
                user = User(
                    email=p_data["email"],
                    hashed_password=hashed_pw,
                    full_name=p_data["full_name"],
                    phone=p_data["phone"],
                    role=UserRole.PATIENT,
                    is_active=True,
                )
                db.add(user)
                existing_patient_users[p_data["email"]] = user

        # Flush to populate patient user IDs
        db.flush()

        # Query existing Patient records mapped by user_id
        patient_user_ids = [u.id for u in existing_patient_users.values()]
        existing_patients = {
            p.user_id: p for p in db.query(Patient).filter(Patient.user_id.in_(patient_user_ids)).all()
        } if patient_user_ids else {}

        patients_list = []
        for p_data in PATIENTS_DATA:
            user = existing_patient_users[p_data["email"]]
            patient = existing_patients.get(user.id)
            if not patient:
                patient = Patient(
                    user_id=user.id,
                    gender=p_data["gender"],
                    date_of_birth=p_data["dob"],
                    blood_group=p_data["blood_group"],
                    address=p_data["address"],
                    emergency_contact=p_data["emergency_contact"],
                    allergies=p_data["allergies"],
                )
                db.add(patient)
                existing_patients[user.id] = patient
                print(f"Created Patient profile: {user.full_name} ({user.email})")
            else:
                print(f"Patient profile exists: {user.full_name} ({user.email})")
            patients_list.append(patient)

        # Flush to populate patient IDs
        db.flush()

        # -------------------------------------------------------------
        # 3. SEEDING DOCTORS & SCHEDULES (60 DOCTORS across 30 DEPARTMENTS)
        # -------------------------------------------------------------
        print("\n=== 3. SEEDING DOCTORS & SCHEDULES (60 DOCTORS across 30 DEPARTMENTS) ===")
        depts_db = db.query(Department).all()
        dept_name_map = {d.name: d for d in depts_db}

        doctor_emails = [d["email"] for d in DOCTORS_DATA]
        existing_doc_users = {
            u.email: u for u in db.query(User).filter(User.email.in_(doctor_emails)).all()
        }

        for d_data in DOCTORS_DATA:
            user = existing_doc_users.get(d_data["email"])
            if not user:
                user = User(
                    email=d_data["email"],
                    hashed_password=hashed_pw,
                    full_name=d_data["full_name"],
                    phone=d_data["phone"],
                    role=UserRole.DOCTOR,
                    is_active=True,
                )
                db.add(user)
                existing_doc_users[d_data["email"]] = user

        # Flush to populate doctor user IDs
        db.flush()

        doc_user_ids = [u.id for u in existing_doc_users.values()]
        existing_doctors = {
            doc.user_id: doc for doc in db.query(Doctor).filter(Doctor.user_id.in_(doc_user_ids)).all()
        } if doc_user_ids else {}

        doctors_list = []
        for d_data in DOCTORS_DATA:
            dept_obj = dept_name_map.get(d_data["dept"])
            assert dept_obj is not None, f"Department '{d_data['dept']}' not found in DB!"
            user = existing_doc_users[d_data["email"]]

            doctor = existing_doctors.get(user.id)
            if not doctor:
                doctor = Doctor(
                    user_id=user.id,
                    department_id=dept_obj.id,
                    medical_registration_number=d_data["reg_no"],
                    qualification=d_data["qualification"],
                    specialty=d_data["specialty"],
                    experience_years=d_data["experience"],
                    consultation_fee=d_data["fee"],
                    room_no=d_data["room_no"],
                    bio=d_data["bio"],
                    profile_photo_url=DOCTOR_PHOTO_MAP.get(d_data["email"]),
                    is_available=True,
                )
                db.add(doctor)
                existing_doctors[user.id] = doctor
                print(f"Created Doctor profile: {user.full_name} -> {d_data['dept']} (Room {d_data['room_no']})")
            else:
                doctor.department_id = dept_obj.id
                doctor.specialty = d_data["specialty"]
                doctor.qualification = d_data["qualification"]
                doctor.experience_years = d_data["experience"]
                doctor.consultation_fee = d_data["fee"]
                doctor.room_no = d_data["room_no"]
                doctor.bio = d_data["bio"]
                if d_data["email"] in DOCTOR_PHOTO_MAP:
                    doctor.profile_photo_url = DOCTOR_PHOTO_MAP[d_data["email"]]
                print(f"Updated Doctor profile: {user.full_name} -> {d_data['dept']}")

            doctors_list.append(doctor)

        # Flush to populate doctor IDs
        db.flush()

        # Pre-fetch existing doctor schedules
        doc_ids = [doc.id for doc in doctors_list]
        existing_schedules = {}
        if doc_ids:
            scheds = db.query(DoctorSchedule).filter(DoctorSchedule.doctor_id.in_(doc_ids)).all()
            for s in scheds:
                existing_schedules[(s.doctor_id, s.day_of_week)] = s

        for d_data, doctor in zip(DOCTORS_DATA, doctors_list):
            leave_days = d_data["leave_days"]
            for day_name in WEEKDAYS:
                sched_key = (doctor.id, day_name)
                sched = existing_schedules.get(sched_key)
                if day_name in leave_days:
                    if sched:
                        sched.is_active = False
                    continue

                if not sched:
                    sched = DoctorSchedule(
                        doctor_id=doctor.id,
                        day_of_week=day_name,
                        start_time=time(9, 0),
                        end_time=time(14, 0),
                        slot_duration_minutes=15,
                        is_active=True,
                    )
                    db.add(sched)
                    existing_schedules[sched_key] = sched

        # -------------------------------------------------------------
        # 4. SEEDING APPOINTMENTS (FOR EXACTLY 16 PATIENTS)
        # -------------------------------------------------------------
        print("\n=== 4. SEEDING APPOINTMENTS (FOR EXACTLY 16 PATIENTS) ===")
        # Flush schedules before querying active schedules
        db.flush()

        # Build in-memory map of active doctor schedules: (doctor_id, day_of_week) -> True
        active_sched_set = {
            (s.doctor_id, s.day_of_week) for s in existing_schedules.values() if s.is_active
        }

        # Pre-fetch existing appointments for these patients
        patient_ids = [p.id for p in patients_list[:16]]
        existing_appts = {}
        if patient_ids:
            appts = db.query(Appointment).filter(Appointment.patient_id.in_(patient_ids)).all()
            for a in appts:
                existing_appts[(a.patient_id, a.doctor_id, a.appointment_date)] = a

        appts_created_count = 0
        base_date = date.today() + timedelta(days=1)

        for idx in range(16):
            patient = patients_list[idx]
            p_info = PATIENTS_DATA[idx]
            target_dept_name = p_info["dept_target"]

            target_doc = None
            for doc in doctors_list:
                if doc.department and doc.department.name == target_dept_name:
                    target_doc = doc
                    break
            if not target_doc:
                target_doc = doctors_list[idx % len(doctors_list)]

            appt_date = base_date + timedelta(days=(idx % 10))
            while True:
                day_name = appt_date.strftime("%A")
                if day_name == "Sunday":
                    appt_date += timedelta(days=1)
                    continue

                if (target_doc.id, day_name) not in active_sched_set:
                    appt_date += timedelta(days=1)
                    continue
                break

            start_hour = 9 + ((idx * 30) // 60)
            start_min = (idx * 30) % 60
            slot_start = time(start_hour, start_min)
            dt_end = datetime.combine(appt_date, slot_start) + timedelta(minutes=15)
            slot_end = dt_end.time()

            appt_key = (patient.id, target_doc.id, appt_date)
            existing_appt = existing_appts.get(appt_key)

            if not existing_appt:
                token = f"TOKEN-{100 + idx}"
                status = (
                    AppointmentStatus.SCHEDULED
                    if idx < 12
                    else (AppointmentStatus.CHECKED_IN if idx < 14 else AppointmentStatus.COMPLETED)
                )
                payment_status = PaymentStatus.UNPAID if status == AppointmentStatus.SCHEDULED else PaymentStatus.PAID
                new_appt = Appointment(
                    patient_id=patient.id,
                    doctor_id=target_doc.id,
                    appointment_date=appt_date,
                    start_time=slot_start,
                    end_time=slot_end,
                    status=status,
                    reason=p_info["reason"],
                    fee=target_doc.consultation_fee,
                    payment_status=payment_status,
                    token_no=token,
                )
                db.add(new_appt)
                existing_appts[appt_key] = new_appt
                appts_created_count += 1
                print(f"Staged Appointment: Patient '{patient.user.full_name}' -> Doctor '{target_doc.user.full_name}' on {appt_date} ({slot_start}) [{status.value}]")
            else:
                print(f"Appointment exists for Patient '{patient.user.full_name}'")

        # Single final commit for the complete demo dataset transaction
        db.commit()
        print("\nDEMO DATA SEEDING COMPLETE SUCCESSFULLY!")

    except Exception as e:
        db.rollback()
        print(f"ERROR DURING SEEDING: {e}")
        raise e
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_demo_dataset()
