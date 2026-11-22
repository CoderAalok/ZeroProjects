# Hospital Visitor Management System (CarePass)

## Project Overview

CarePass is a browser-based Hospital Visitor Management System developed using HTML5, CSS3, and Vanilla JavaScript. It is designed to simplify and manage the hospital visitor registration and verification process through separate interfaces for visitors, hospital staff, and patients.

The application simulates the complete visitor management lifecycle, from submitting a visit request to approval, entry verification, and exit recording. It uses browser storage to manage and maintain application data without requiring a backend server or database.

## Team CoderBuddy

**Team Members:**
- Alok Kumar Yadav – Team Leader
- Aditya Parkash – Team Member
- Gaurav Dubey – Team Member

## Team Responsibilities

| Team Member | Role | Responsibilities |
|---|---|---|
| Alok Kumar Yadav | Functionality & Logic | JavaScript functionality, application logic, data handling, and workflow management. |
| Aditya Parkash | Design & Styling | CSS styling, visual design, responsive layouts, and user interface appearance. |
| Gaurav Dubey | Structure Design | HTML structure, page organization, and interface components. |

## Key Features

### 1. Visitor Portal
- Submit patient visit requests.
- Complete demo OTP verification.
- Select available visit dates and time slots.
- Track visit request status.
- Access approved digital visitor passes.

### 2. Staff Portal
- Review incoming visitor requests.
- Approve or reject visit applications.
- Verify visitor identity at hospital entry.
- Record visitor entry and exit timestamps.
- Monitor currently active visits.
- Search visitor records and access audit logs.
- Receive notifications about pending requests.

### 3. Patient Portal
- View associated visitor information.
- Access visitor details and visit history.
- Maintain visitor privacy through masked phone numbers.

## Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Defines the structure of the application. |
| CSS3 | Handles styling, layouts, and responsiveness. |
| Vanilla JavaScript | Implements application logic and functionality. |
| DOM API | Dynamically accesses and updates webpage elements. |
| Browser APIs | Provides browser-level functionality. |
| Local Storage | Maintains application data across browser sessions. |
| Session Storage | Stores temporary session-related information. |

**Technical Scope:** The project does not use any frontend framework, backend server, database, package manager, or external dependencies.

## Visitor Management Lifecycle

The application follows a structured visitor workflow:


                    VISITOR
                       |
                       | Submit Booking Request
                       ▼
                    PENDING
                       |
          ┌────────────┼──────────────┐
          |            |              |
          ▼            ▼              ▼
       APPROVED     REJECTED      CANCELLED
          |
          | Security Desk
          | Verifies Pass ID
          ▼
        ACTIVE
          |
          | Security Desk
          | Records Departure
          ▼
        EXITED


**Lifecycle Explanation:**
- **Pending:** A visitor submits a request awaiting staff approval.
- **Approved:** Staff accepts the visit request.
- **Active:** The visitor's entry is verified and recorded.
- **Exited:** The visitor's exit is recorded.
- **Rejected:** Staff declines the visit request.

Pending and approved requests also expire automatically after their scheduled visit slots have passed.

## Project Architecture

The project follows a modular file structure that separates HTML, CSS, and JavaScript responsibilities.

```text
CarePass_Visitor_Management/
│
├── index.html
├── visitor.html
├── staff.html
├── patient.html
│
├── css/
│   ├── common.css
│   ├── home.css
│   ├── portal-split.css
│   ├── visitor.css
│   ├── staff.css
│   └── patient.css
│
└── js/
    ├── common.js
    ├── visitor.js
    ├── staff.js
    └── patient.js
```

### File Responsibilities

- **HTML:** Defines the structure of the home page and individual portals.
- **CSS:** Controls the visual presentation and styling of each interface.
- **JavaScript:** Handles application logic, event management, data processing, and visitor workflow operations.

JavaScript is further divided into four files to maintain modularity and make the application easier to maintain, debug, and extend.

## Installation and Execution

### Step 1: Clone the Repository

```bash
git clone https://github.com/CoderAalok/ZeroProjects.git
```

### Step 2: Navigate to the Project Directory

```bash
cd ZeroProjects/CarePass_Visitor_Management
```

### Step 3: Launch the Application

Open `index.html` in a modern web browser such as Google Chrome, Microsoft Edge, or Mozilla Firefox.

No additional installation or configuration is required.

## Demo Staff Credentials

| Credential | Value |
|---|---|
| Username | `staff` |
| Password | `staff123` |

These credentials are intended exclusively for demonstration purposes.

## Testing the Visitor Workflow

Follow these steps to test the complete visitor management process:

1. Open `visitor.html` and submit a visitor request.
2. Complete the demo OTP verification.
3. Open `staff.html` in another browser tab.
4. Review the submitted visitor request.
5. Approve or reject the request.
6. Return to the visitor portal to check the updated request status.
7. If approved, proceed with the staff entry verification and exit recording.

**Important:** Both portals must be opened in the same browser profile because the application uses Local Storage to share data between browser tabs.

## Demo Data and Authentication

- A demonstration OTP is displayed directly in the visitor interface.
- No actual SMS or external OTP verification service is integrated.
- Staff credentials and patient information are included in JavaScript.
- Authentication is simulated for demonstration purposes.

## Project Limitations

CarePass is currently a frontend demonstration rather than a production-ready hospital management solution.

Its current limitations include:

- No backend server or database integration.
- No production-grade authentication.
- No actual SMS-based OTP verification.
- No server-side data validation.
- No synchronization across different devices.
- No tamper-resistant audit history.
- Browser storage can be modified or deleted by users.
- Visit scheduling and expiration depend on the device's system clock.

## Future Enhancements

The following improvements can extend CarePass into a more comprehensive hospital visitor management solution:

1. **Backend Integration:** Implement Node.js and Express.js for server-side application logic.
2. **Database Integration:** Introduce PostgreSQL or MongoDB for centralized data management.
3. **Secure Authentication:** Implement secure authentication for staff and patients.
4. **Real OTP Verification:** Integrate an SMS gateway for actual visitor verification.
5. **QR Code Visitor Passes:** Generate QR codes for faster visitor identification.
6. **Server-Side Validation:** Implement secure booking and scheduling validation.
7. **Role-Based Access Control:** Introduce permissions for different user roles.
8. **Centralized Data Management:** Enable secure data synchronization across devices.
9. **Automated Notifications:** Introduce real-time notifications for visitor requests and approvals.

## Conclusion

CarePass demonstrates how frontend web technologies can be combined to develop a structured hospital visitor management application. By separating visitor, staff, and patient interfaces, the project provides a practical demonstration of modular JavaScript development, DOM manipulation, browser storage, event handling, and application workflow management.

The project also establishes a foundation for future development through backend integration, database connectivity, and secure authentication.
