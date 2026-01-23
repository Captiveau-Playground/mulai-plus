# 📘 Backoffice Spec (Compact)

## Program Beasiswa Mentoring – MULAI+

Dokumen ringkas ini berisi **spesifikasi backoffice inti** untuk menjalankan **1 program Beasiswa Mentoring (gratis, berbasis seleksi)**. Ditujukan untuk **AI vibe coding / rapid dev**.

---

## 1. Goal

Backoffice memungkinkan admin:

* Membuat & menjalankan 1 program mentoring
* Menyeleksi peserta berbasis refleksi
* Mengelola mentor & peserta
* Menjalankan cohort dari awal sampai selesai

Prinsip: **program-centric, manual control, simple MVP**.

---

## 2. Roles

* **Admin**: full access
* **Mentor**: view program & peserta (opsional notes)
* **Student**: apply program

---

## 3. Core Modules

### 3.1 Program

Admin membuat program mentoring.

Field:

* name
* description
* duration_weeks
* quota
* status: draft | open | running | completed

---

### 3.2 Syllabus

Silabus per minggu (informative only).

Field:

* program_id
* week
* title
* outcome

---

### 3.3 Mentor Assignment

* Program ↔ Mentor (many-to-many)

---

### 3.4 Application (Pendaftaran)

Student apply ke program + isi refleksi.

Field:

* program_id
* student_id
* reflective_answers
* status: applied | accepted | rejected | waitlisted

---

### 3.5 Selection

Admin review aplikasi & update status.

* No scoring system
* Manual decision

---

### 3.6 Commitment Gate

Peserta accepted wajib setuju komitmen.

Field:

* application_id
* agreed_at

Rule:

* Tanpa agreement → tidak bisa active

---

### 3.7 Participant

Peserta aktif dalam program.

Field:

* program_id
* student_id
* status: confirmed | active | dropped | completed

---

### 3.8 Session (Optional – light)

Group mentoring session.

Field:

* program_id
* mentor_id
* datetime
* notes

---

## 4. Admin UI Structure

```
/admin
├── Dashboard
├── Programs
│   └── Detail
│       ├── Info
│       ├── Syllabus
│       ├── Mentors
│       ├── Applications
│       └── Participants
├── Mentors
├── Students
└── Reports
```

---

## 5. Data Model (High-level)

```
User(id, role)
Program(id, name, duration, status)
Syllabus(program_id, week, title)
Application(program_id, student_id, answers, status)
Commitment(application_id, agreed_at)
Participant(program_id, student_id, status)
Session(program_id, mentor_id, datetime)
```

---

## 6. MVP Rules

* 1 program aktif per periode
* Seleksi manual
* Soft delete only
* CSV export

---

## 7. Success Criteria

* Admin bisa jalanin 1 cohort full
* Seleksi & status peserta jelas
* Tidak pakai spreadsheet

---

📌 **Ini adalah baseline spec untuk AI-assisted development (Phase 1).**
