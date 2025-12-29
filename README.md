# Social Connect - Django Social Media Platform

A clean, template-based social media platform built with Django.

## ✨ Features

- **User Authentication**: Sign up, login, logout with profile photo upload
- **User Profiles**: Customizable profiles with bio, location, website, profile and cover photos
- **Posts**: Create posts with text and images
- **Social Interactions**: Like and comment on posts
- **Friends System**: Send and accept friend requests
- **Messaging**: Private conversations between users (non-realtime)
- **Default Images**: Automatic fallback to default profile/cover photos

## 📁 Project Structure

```
Final-project/
├── social_connect/          # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── core/                    # Main application
│   ├── models.py           # Database models (User, Post, Comment, etc.)
│   ├── views.py            # View functions
│   ├── urls.py             # URL routing
│   └── admin.py            # Admin configuration
├── templates/               # HTML templates
│   ├── login.html
│   ├── signup.html
│   ├── index.html          # Home feed
│   ├── profile.html        # User profile
│   ├── messages.html       # Conversations list
│   └── conversation.html   # Chat view
├── static/                  # Static files
│   └── css/                # CSS stylesheets
├── media/                   # User uploads
│   └── defaults/           # Default images
├── manage.py
└── db.sqlite3              # Database
```

## 🚀 Getting Started

### Server is Already Running!
The Django development server is running at: **http://127.0.0.1:8000/**

### Create Your First Account
1. Open your browser and go to: **http://127.0.0.1:8000/signup/**
2. Fill in the registration form:
   - Username
   - Email
   - Password
   - Confirm Password
   - Profile Photo (optional - defaults will be used if not provided)
3. Click "Sign Up"

### Start Using the Platform
After signing up, you'll be automatically logged in and can:
- ✅ Create posts with text and images
- ✅ View and edit your profile
- ✅ Add friends
- ✅ Send messages
- ✅ Like and comment on posts


## 🛠️ Commands

### Stop the Server
Press `CTRL+C` in the terminal where server is running

### Make VE
```bash
python3 -m venv venv
```

### Start the Server
```bash
.\venv\Scripts\python.exe manage.py runserver
```

### Make Database Changes
```bash
.\venv\Scripts\python.exe manage.py makemigrations
.\venv\Scripts\python.exe manage.py migrate
```

### Create Admin User
```bash
.\venv\Scripts\python.exe manage.py createsuperuser
```

Then access admin at: http://127.0.0.1:8000/admin/


## 📝 Notes

- Database: SQLite (stored in `db.sqlite3`)
- Media files uploaded to: `media/profiles/`, `media/covers/`, `media/posts/`
- Default images in: `media/defaults/`
- Virtual environment in: `venv/` (activated automatically by commands above)

---

## 📄 Documentation

To see all documentation, scan the QR code below:

![Scan for Documentation](qrcodesocialconnect.png)
