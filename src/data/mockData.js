// Mock data for the Student Dashboard App

// Punjab, Pakistan cities for random location assignment
const punjabCities = [
  'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 
  'Sargodha', 'Bahawalpur', 'Sheikhupura', 'Jhang', 'Rahim Yar Khan', 
  'Gujrat', 'Kasur', 'Mardan', 'Mingora', 'Nawabshah', 'Chiniot', 
  'Kotri', 'Khanpur', 'Hafizabad', 'Kohat', 'Jacobabad', 'Shikarpur', 
  'Muzaffargarh', 'Khanewal', 'Gojra', 'Bahawalnagar', 'Abbottabad', 
  'Muridke', 'Pakpattan', 'Chakwal', 'Toba Tek Singh', 'Jhelum', 
  'Dera Ghazi Khan', 'Kamalia', 'Kot Addu', 'Nowshera', 'Swabi', 
  'Khushab', 'Dera Ismail Khan', 'Chaman', 'Charsadda', 'Mandi Bahauddin'
];

// Generate random attendance data
const generateAttendanceData = () => {
  const total = 30; // Total classes
  const present = Math.floor(Math.random() * (total - 5)) + 20; // 20-25 present
  const absent = Math.floor(Math.random() * 8) + 1; // 1-8 absent
  const leave = total - present - absent; // Remaining as leave
  const percentage = Math.round((present / total) * 100 * 10) / 10; // Round to 1 decimal
  
  return {
    total,
    present,
    absent,
    leave,
    percentage
  };
};

// Generate random phone number
const generatePhoneNumber = () => {
  const prefixes = ['0300', '0301', '0302', '0303', '0304', '0305', '0306', '0307', '0308', '0309', '0310', '0311', '0312', '0313', '0314', '0315', '0316', '0317', '0318', '0319', '0320', '0321', '0322', '0323', '0324', '0325', '0326', '0327', '0328', '0329', '0330', '0331', '0332', '0333', '0334', '0335', '0336', '0337', '0338', '0339', '0340', '0341', '0342', '0343', '0344', '0345', '0346', '0347', '0348', '0349', '0350', '0351', '0352', '0353', '0354', '0355', '0356', '0357', '0358', '0359', '0360', '0361', '0362', '0363', '0364', '0365', '0366', '0367', '0368', '0369', '0370', '0371', '0372', '0373', '0374', '0375', '0376', '0377', '0378', '0379', '0380', '0381', '0382', '0383', '0384', '0385', '0386', '0387', '0388', '0389', '0390', '0391', '0392', '0393', '0394', '0395', '0396', '0397', '0398', '0399'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 9000000) + 1000000; // 7 digit number
  return `+92 ${prefix} ${number.toString().slice(0, 3)} ${number.toString().slice(3)}`;
};

// Generate random blood group
const generateBloodGroup = () => {
  const bloodGroups = ['A+ve', 'A-ve', 'B+ve', 'B-ve', 'AB+ve', 'AB-ve', 'O+ve', 'O-ve'];
  return bloodGroups[Math.floor(Math.random() * bloodGroups.length)];
};

// Generate random date of birth (ages 16-25)
const generateDateOfBirth = () => {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - Math.floor(Math.random() * 10) - 16; // 16-25 years old
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1; // Using 28 to avoid invalid dates
  return `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

// Generate random parent name
const generateParentName = () => {
  const firstNames = ['Muhammad', 'Ali', 'Ahmed', 'Hassan', 'Hussain', 'Abdul', 'Ibrahim', 'Yusuf', 'Omar', 'Khalid', 'Fatima', 'Aisha', 'Khadija', 'Maryam', 'Zainab', 'Amina', 'Ruqayya', 'Umm Kulthum', 'Safiya', 'Hafsa'];
  const lastNames = ['Khan', 'Ahmed', 'Ali', 'Hassan', 'Hussain', 'Malik', 'Sheikh', 'Raza', 'Abbas', 'Rizvi', 'Naqvi', 'Jafri', 'Hashmi', 'Qureshi', 'Chaudhry', 'Butt', 'Cheema', 'Gill', 'Sandhu', 'Singh'];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
};

const students = [
  {
    id: '1',
    name: 'Sonia',
    email: 'sonia@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '2',
    name: 'Muhammad Asad',
    email: 'muhammad.asad@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '3',
    name: 'Bilal Nasir',
    email: 'bilal.nasir@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '4',
    name: 'Fatima',
    email: 'fatima@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '5',
    name: 'Farah Nazeer',
    email: 'farah.nazeer@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '6',
    name: 'Abdul Qudus',
    email: 'abdul.qudus@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '7',
    name: 'Manzer Abas',
    email: 'manzer.abas@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '8',
    name: 'Abdul Malik',
    email: 'abdul.malik@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '9',
    name: 'Kashif Mehmood',
    email: 'kashif.mehmood@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '10',
    name: 'Saba Noreen',
    email: 'saba.noreen@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '11',
    name: 'Nagina Bibi',
    email: 'nagina.bibi@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '12',
    name: 'Perwasha Nazeer',
    email: 'perwasha.nazeer@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '13',
    name: 'Aneesha Shareef',
    email: 'aneesha.shareef@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '14',
    name: 'Idrees Raza',
    email: 'idrees.raza@gmail.com',
    phone: '+92 300 123 4567',
    address: '456 Main Street, Chowk Azam, Punjab, Pakistan',
    dateOfBirth: '2003-10-20',
    bloodGroup: 'B+ve',
    gender: 'male',
    parentName: 'Ahmed Riaz',
    parentContact: '+92 300 987 6543',
    profileImage: require('../../assets/image.jpg'),
    attendance: {
      total: 30,
      present: 27,
      absent: 2,
      leave: 1,
      percentage: 90.0
    },
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '15',
    name: 'Samreen Bibi',
    email: 'samreen.bibi@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '16',
    name: 'Zohaib Tariq',
    email: 'zohaib.tariq@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '17',
    name: 'Umair Afzal',
    email: 'umair.afzal@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '18',
    name: 'Mujahid',
    email: 'mujahid@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '19',
    name: 'Tania',
    email: 'tania@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '20',
    name: 'Muhammad Talha',
    email: 'muhammad.talha@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '21',
    name: 'Muhammad Mushtaq',
    email: 'muhammad.mushtaq@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '22',
    name: 'Muhammad Faizan',
    email: 'muhammad.faizan@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '23',
    name: 'Mishal Rasool',
    email: 'mishal.rasool@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '24',
    name: 'Azeem Khan',
    email: 'azeem.khan@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '25',
    name: 'Maha Maryam',
    email: 'maha.maryam@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '26',
    name: 'Noor Akbar',
    email: 'noor.akbar@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'male',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '27',
    name: 'Fiza Arshad',
    email: 'fiza.arshad@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '28',
    name: 'Amna Ashraf',
    email: 'amna.ashraf@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  },
  {
    id: '29',
    name: 'Zoha Imran',
    email: 'zoha.imran@student.edu',
    phone: generatePhoneNumber(),
    address: `${Math.floor(Math.random() * 999) + 1} Main Street, ${punjabCities[Math.floor(Math.random() * punjabCities.length)]}, Punjab, Pakistan`,
    dateOfBirth: generateDateOfBirth(),
    bloodGroup: generateBloodGroup(),
    gender: 'female',
    parentName: generateParentName(),
    parentContact: generatePhoneNumber(),
    profileImage: null,
    attendance: generateAttendanceData(),
    courses: ['Mathematics', 'Science', 'English', 'Social Studies']
  }
];

// Generate random grade and percentage
const generateGradeAndPercentage = () => {
  const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'];
  const grade = grades[Math.floor(Math.random() * grades.length)];
  const percentage = Math.floor(Math.random() * 40) + 60; // 60-100%
  return { grade, percentage };
};

const courses = [
  {
    id: '1',
    name: 'Mathematics',
    code: 'MATH101',
    description: 'Advanced Mathematics Course',
    instructor: 'Dr. Ahmed Khan',
    credits: 3,
    students: students.slice(0, 15).map(s => s.id),
    attendance: generateAttendanceData(),
    assignments: [
      { name: 'Algebra Basics', grade: 'A', percentage: 92 },
      { name: 'Geometry Quiz', grade: 'B+', percentage: 87 },
      { name: 'Calculus Test', grade: 'A-', percentage: 89 }
    ],
    ...generateGradeAndPercentage()
  },
  {
    id: '2',
    name: 'Science',
    code: 'SCI101',
    description: 'General Science Course',
    instructor: 'Dr. Fatima Ali',
    credits: 3,
    students: students.slice(0, 20).map(s => s.id),
    attendance: generateAttendanceData(),
    assignments: [
      { name: 'Physics Lab', grade: 'A+', percentage: 95 },
      { name: 'Chemistry Test', grade: 'B', percentage: 82 },
      { name: 'Biology Project', grade: 'A', percentage: 91 }
    ],
    ...generateGradeAndPercentage()
  },
  {
    id: '3',
    name: 'English',
    code: 'ENG101',
    description: 'English Language and Literature',
    instructor: 'Prof. Sarah Ahmed',
    credits: 3,
    students: students.map(s => s.id),
    attendance: generateAttendanceData(),
    assignments: [
      { name: 'Essay Writing', grade: 'A-', percentage: 88 },
      { name: 'Grammar Test', grade: 'B+', percentage: 85 },
      { name: 'Literature Analysis', grade: 'A', percentage: 90 }
    ],
    ...generateGradeAndPercentage()
  },
  {
    id: '4',
    name: 'Social Studies',
    code: 'SOC101',
    description: 'Social Studies and History',
    instructor: 'Dr. Muhammad Hassan',
    credits: 2,
    students: students.slice(0, 25).map(s => s.id),
    attendance: generateAttendanceData(),
    assignments: [
      { name: 'History Quiz', grade: 'B+', percentage: 86 },
      { name: 'Geography Test', grade: 'A-', percentage: 89 },
      { name: 'Civics Project', grade: 'A', percentage: 93 }
    ],
    ...generateGradeAndPercentage()
  }
];
// Generate individual attendance records for each student
const generateAttendanceRecords = () => {
  const records = [];
  const courses = ['Mathematics', 'Science', 'English', 'Social Studies'];
  const statuses = ['present', 'absent', 'leave'];
  const timeSlots = ['Morning', 'Afternoon', 'Evening'];
  
  students.forEach(student => {
    // Generate 10-15 attendance records per student
    const recordCount = Math.floor(Math.random() * 6) + 10;
    
    for (let i = 0; i < recordCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Last 30 days
      
      records.push({
        id: `${student.id}_${i}`,
        studentId: student.id,
        studentName: student.name,
        date: date.toISOString(),
        course: courses[Math.floor(Math.random() * courses.length)],
        time: timeSlots[Math.floor(Math.random() * timeSlots.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)]
      });
    }
  });
  
  return records.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const attendanceData = generateAttendanceRecords();

// Export all data
export { students, courses, attendanceData };
