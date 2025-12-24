// Login validation and student lookup
// This file contains the logic to validate roll number and password

// Read student data from external file
function validateLogin() {
    const form = document.forms['f1'];
    const rollNo = form.login.value.trim().toUpperCase();
    const password = form.pass.value.trim().toUpperCase();
    
    // Check if fields are empty
    if (!rollNo || !password) {
        alert('Please enter both Roll Number and Password');
        return false;
    }
    
    // Password must match Roll Number
    if (rollNo !== password) {
        alert('Invalid Roll Number or Password');
        form.login.value = '';
        form.pass.value = '';
        return false;
    }
    
    // Look up student in database
    const student = findStudent(rollNo);
    
    if (student) {
        // Redirect to profile page with student data
        const params = new URLSearchParams({
            roll: student.rollNo,
            name: student.name,
            father: student.fatherName
        });
        window.location.href = 'student_profile.html?' + params.toString();
        return false;
    } else {
        alert('Invalid Roll Number or Password');
        form.login.value = '';
        form.pass.value = '';
        return false;
    }
}

// Find student by roll number
function findStudent(rollNo) {
    // This will be populated with actual data
    const students = loadStudentData();
    return students[rollNo] || null;
}

// Load student data (will be generated from database)
function loadStudentData() {
    return STUDENTS_DB;
}
