import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Clear existing data
  const tables = ["PayRun","OnboardingTask","OnboardingTemplate","Webhook","AuditLog","Position","Document",
    "SurveyResponse","Survey","Candidate","JobPosting","SalaryBand","CompensationRecord",
    "KeyResult","Goal","PerformanceReview","ReviewCycle","Attendance","TimeOffRequest",
    "TimeOffPolicy","User","Employee","Team","Department","Site","Company"];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }

  // Create Company — fixed ID so session tokens survive rebuilds
  const company = await prisma.company.create({
    data: {
      id: "acme-technologies-seed-company",
      name: "Acme Technologies", logo: "https://via.placeholder.com/200x200?text=Acme",
      domain: "acme.tech",
      settings: JSON.stringify({ timezone: "UTC", language: "en", currency: "USD" }),
    },
  });

  // Create Sites
  const sites = await Promise.all([
    prisma.site.create({ data: { companyId: company.id, name: "New York", address: "123 Tech Avenue, New York, NY 10001", country: "USA", timezone: "America/New_York" } }),
    prisma.site.create({ data: { companyId: company.id, name: "London", address: "456 Innovation Street, London, UK", country: "UK", timezone: "Europe/London" } }),
    prisma.site.create({ data: { companyId: company.id, name: "Tel Aviv", address: "789 Tech Park, Tel Aviv, Israel", country: "Israel", timezone: "Asia/Jerusalem" } }),
    prisma.site.create({ data: { companyId: company.id, name: "Berlin", address: "321 Digital Way, Berlin, Germany", country: "Germany", timezone: "Europe/Berlin" } }),
    prisma.site.create({ data: { companyId: company.id, name: "Sydney", address: "654 Future Lane, Sydney, Australia", country: "Australia", timezone: "Australia/Sydney" } }),
  ]);

  // Create Departments
  const departments = await Promise.all([
    prisma.department.create({ data: { companyId: company.id, name: "Executive" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Engineering" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Product" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Design" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Marketing" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Sales" } }),
    prisma.department.create({ data: { companyId: company.id, name: "HR" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Finance" } }),
    prisma.department.create({ data: { companyId: company.id, name: "Operations" } }),
  ]);
  const [execDept, engDept, prodDept, desDept, markDept, salesDept, hrDept, finDept, opsDept] = departments;

  // Create Teams
  const teams = await Promise.all([
    prisma.team.create({ data: { departmentId: engDept.id, name: "Backend" } }),
    prisma.team.create({ data: { departmentId: engDept.id, name: "Frontend" } }),
    prisma.team.create({ data: { departmentId: engDept.id, name: "DevOps" } }),
    prisma.team.create({ data: { departmentId: prodDept.id, name: "Core Product" } }),
    prisma.team.create({ data: { departmentId: prodDept.id, name: "Analytics" } }),
    prisma.team.create({ data: { departmentId: desDept.id, name: "UI/UX" } }),
    prisma.team.create({ data: { departmentId: markDept.id, name: "Content" } }),
    prisma.team.create({ data: { departmentId: markDept.id, name: "Growth" } }),
    prisma.team.create({ data: { departmentId: salesDept.id, name: "Enterprise" } }),
    prisma.team.create({ data: { departmentId: salesDept.id, name: "Mid-Market" } }),
  ]);

  // Create Employees
  const empData = [
    { email: "sarah.johnson@acme.tech", first: "Sarah", last: "Johnson", dept: execDept.id, site: 0, team: null, type: "FULL_TIME", start: "2015-01-15", title: "Chief Executive Officer" },
    { email: "michael.chen@acme.tech", first: "Michael", last: "Chen", dept: engDept.id, site: 0, team: null, type: "FULL_TIME", start: "2016-06-20", title: "VP of Engineering" },
    { email: "emma.watson@acme.tech", first: "Emma", last: "Watson", dept: prodDept.id, site: 1, team: null, type: "FULL_TIME", start: "2017-03-10", title: "VP of Product" },
    { email: "alex.rivera@acme.tech", first: "Alex", last: "Rivera", dept: desDept.id, site: 2, team: null, type: "FULL_TIME", start: "2018-01-08", title: "VP of Design" },
    { email: "james.smith@acme.tech", first: "James", last: "Smith", dept: engDept.id, site: 0, team: 0, type: "FULL_TIME", start: "2018-04-15", title: "Engineering Manager" },
    { email: "priya.patel@acme.tech", first: "Priya", last: "Patel", dept: engDept.id, site: 0, team: 0, type: "FULL_TIME", start: "2019-08-01", title: "Senior Backend Engineer" },
    { email: "david.kumar@acme.tech", first: "David", last: "Kumar", dept: engDept.id, site: 3, team: 0, type: "FULL_TIME", start: "2020-05-12", title: "Backend Engineer" },
    { email: "olivia.brown@acme.tech", first: "Olivia", last: "Brown", dept: engDept.id, site: 1, team: 1, type: "FULL_TIME", start: "2018-09-20", title: "Engineering Manager" },
    { email: "lucas.silva@acme.tech", first: "Lucas", last: "Silva", dept: engDept.id, site: 1, team: 1, type: "FULL_TIME", start: "2019-04-18", title: "Senior Frontend Engineer" },
    { email: "isabella.rossi@acme.tech", first: "Isabella", last: "Rossi", dept: engDept.id, site: 4, team: 1, type: "FULL_TIME", start: "2021-06-01", title: "Frontend Engineer" },
    { email: "ryan.torres@acme.tech", first: "Ryan", last: "Torres", dept: engDept.id, site: 2, team: 2, type: "FULL_TIME", start: "2017-11-13", title: "Engineering Manager" },
    { email: "natalia.koleva@acme.tech", first: "Natalia", last: "Koleva", dept: engDept.id, site: 2, team: 2, type: "FULL_TIME", start: "2020-02-10", title: "DevOps Engineer" },
    { email: "marcus.johnson@acme.tech", first: "Marcus", last: "Johnson", dept: prodDept.id, site: 1, team: 3, type: "FULL_TIME", start: "2019-04-22", title: "Senior Product Manager" },
    { email: "sophie.martin@acme.tech", first: "Sophie", last: "Martin", dept: prodDept.id, site: 1, team: 4, type: "FULL_TIME", start: "2020-08-24", title: "Product Analyst" },
    { email: "carlos.mendez@acme.tech", first: "Carlos", last: "Mendez", dept: desDept.id, site: 2, team: 5, type: "FULL_TIME", start: "2017-09-25", title: "Design Lead" },
    { email: "yuki.tanaka@acme.tech", first: "Yuki", last: "Tanaka", dept: desDept.id, site: 4, team: 5, type: "FULL_TIME", start: "2021-01-11", title: "UI Designer" },
    { email: "rebecca.hall@acme.tech", first: "Rebecca", last: "Hall", dept: markDept.id, site: 3, team: 6, type: "FULL_TIME", start: "2018-05-14", title: "Marketing Manager" },
    { email: "thomas.weber@acme.tech", first: "Thomas", last: "Weber", dept: markDept.id, site: 3, team: 6, type: "FULL_TIME", start: "2020-09-07", title: "Content Writer" },
    { email: "amelia.lee@acme.tech", first: "Amelia", last: "Lee", dept: markDept.id, site: 0, team: 7, type: "FULL_TIME", start: "2021-03-22", title: "Growth Marketing Specialist" },
    { email: "christopher.quinn@acme.tech", first: "Christopher", last: "Quinn", dept: salesDept.id, site: 0, team: 8, type: "FULL_TIME", start: "2017-07-10", title: "Sales Manager" },
    { email: "diana.foster@acme.tech", first: "Diana", last: "Foster", dept: salesDept.id, site: 0, team: 8, type: "FULL_TIME", start: "2019-04-09", title: "Account Executive" },
    { email: "erik.anderson@acme.tech", first: "Erik", last: "Anderson", dept: salesDept.id, site: 3, team: 9, type: "FULL_TIME", start: "2020-04-25", title: "Sales Development Rep" },
    { email: "helen.clark@acme.tech", first: "Helen", last: "Clark", dept: hrDept.id, site: 0, team: null, type: "FULL_TIME", start: "2016-02-01", title: "HR Manager" },
    { email: "jessica.white@acme.tech", first: "Jessica", last: "White", dept: hrDept.id, site: 1, team: null, type: "FULL_TIME", start: "2019-11-04", title: "Recruiter" },
    { email: "george.phillips@acme.tech", first: "George", last: "Phillips", dept: finDept.id, site: 0, team: null, type: "FULL_TIME", start: "2015-08-17", title: "Finance Manager" },
    { email: "victoria.adams@acme.tech", first: "Victoria", last: "Adams", dept: finDept.id, site: 0, team: null, type: "FULL_TIME", start: "2020-01-20", title: "Accountant" },
    { email: "william.turner@acme.tech", first: "William", last: "Turner", dept: opsDept.id, site: 0, team: null, type: "FULL_TIME", start: "2018-10-08", title: "Operations Manager" },
    { email: "zoey.sanders@acme.tech", first: "Zoey", last: "Sanders", dept: hrDept.id, site: 0, team: null, type: "INTERN", start: "2023-06-01", title: "HR Intern" },
  ];

  // Salary history per employee index — mirrors workInfo.salaryHistory used on the profile page.
  // Past entries = historical record; future entries = approved upcoming increases.
  const today = new Date();
  const y = today.getFullYear();
  const salaryMap: Record<number, Array<{ effectiveDate: string; contractType: string; salaryType: string; salaryAmount: string; salaryCurrency: string; note: string }>> = {
    0:  [ // Sarah Johnson — CEO
      { effectiveDate: "2015-01-15", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "220000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2018-01-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "260000", salaryCurrency: "USD", note: "Promotion to CEO" },
      { effectiveDate: "2022-01-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "300000", salaryCurrency: "USD", note: "Annual review" },
      { effectiveDate: `${y}-07-01`, contractType: "Full-time", salaryType: "Bonus", salaryAmount: "50000", salaryCurrency: "USD", note: "Performance bonus H1" },
    ],
    1:  [ // Michael Chen — VP Engineering
      { effectiveDate: "2016-06-20", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "170000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2020-01-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "210000", salaryCurrency: "USD", note: "Promoted to VP" },
      { effectiveDate: `${y}-06-01`, contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "225000", salaryCurrency: "USD", note: "Annual increase" },
    ],
    2:  [ // Emma Watson — VP Product
      { effectiveDate: "2017-03-10", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "160000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2021-03-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "195000", salaryCurrency: "USD", note: "Promoted to VP" },
      { effectiveDate: `${y}-09-01`, contractType: "Full-time", salaryType: "Bonus", salaryAmount: "30000", salaryCurrency: "USD", note: "Annual bonus" },
    ],
    4:  [ // James Smith — Engineering Manager
      { effectiveDate: "2018-04-15", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "135000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2022-04-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "155000", salaryCurrency: "USD", note: "Annual review" },
      { effectiveDate: `${y}-05-01`, contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "165000", salaryCurrency: "USD", note: "Approved increase" },
    ],
    5:  [ // Priya Patel — Senior Backend Engineer
      { effectiveDate: "2019-08-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "115000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2022-08-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "135000", salaryCurrency: "USD", note: "Senior promotion" },
      { effectiveDate: `${y}-08-01`, contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "148000", salaryCurrency: "USD", note: "Planned annual review" },
    ],
    6:  [ // David Kumar — Backend Engineer
      { effectiveDate: "2020-05-12", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "95000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2023-05-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "110000", salaryCurrency: "USD", note: "Annual review" },
      { effectiveDate: `${y}-06-01`, contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "120000", salaryCurrency: "USD", note: "Approved raise" },
    ],
    7:  [ // Olivia Brown — Engineering Manager
      { effectiveDate: "2018-09-20", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "130000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2022-01-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "150000", salaryCurrency: "USD", note: "Annual review" },
    ],
    8:  [ // Lucas Silva — Senior Frontend Engineer
      { effectiveDate: "2019-01-15", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "112000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2023-01-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "130000", salaryCurrency: "USD", note: "Annual review" },
      { effectiveDate: `${y}-07-01`, contractType: "Full-time", salaryType: "Bonus", salaryAmount: "15000", salaryCurrency: "USD", note: "Retention bonus" },
    ],
    9:  [ // Isabella Rossi — Frontend Engineer
      { effectiveDate: "2021-06-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "88000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: `${y}-06-01`, contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "98000", salaryCurrency: "USD", note: "Annual increase" },
    ],
    14: [ // Carlos Mendez — Design Lead
      { effectiveDate: "2017-09-25", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "125000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2021-09-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "145000", salaryCurrency: "USD", note: "Lead promotion" },
      { effectiveDate: `${y}-09-01`, contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "158000", salaryCurrency: "USD", note: "Planned review" },
    ],
    19: [ // Christopher Quinn — Sales Manager
      { effectiveDate: "2017-07-10", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "105000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2021-07-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "125000", salaryCurrency: "USD", note: "Annual review" },
      { effectiveDate: `${y}-07-01`, contractType: "Full-time", salaryType: "Bonus", salaryAmount: "20000", salaryCurrency: "USD", note: "Q2 sales bonus" },
    ],
    23: [ // Helen Clark — HR Manager
      { effectiveDate: "2016-02-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "100000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2022-02-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "118000", salaryCurrency: "USD", note: "Annual review" },
      { effectiveDate: `${y}-10-01`, contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "128000", salaryCurrency: "USD", note: "Planned increase" },
    ],
    25: [ // George Phillips — Finance Manager
      { effectiveDate: "2015-08-17", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "115000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2020-08-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "135000", salaryCurrency: "USD", note: "Annual review" },
      { effectiveDate: `${y}-08-01`, contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "145000", salaryCurrency: "USD", note: "Approved increase" },
    ],
    26: [ // Victoria Adams — Accountant
      { effectiveDate: "2020-01-20", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "78000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2023-01-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "90000", salaryCurrency: "USD", note: "Annual review" },
    ],
  };

  // Personal info per employee index — gender, dateOfBirth, and other personal details
  const personalInfoMap: Record<number, { gender: string; dateOfBirth: string; nationality?: string; nationalId?: string; address?: string; city?: string; country?: string }> = {
    0:  { gender: "Female", dateOfBirth: "1978-03-22", nationality: "American", nationalId: "482913847", address: "45 Park Ave", city: "New York", country: "USA" },
    1:  { gender: "Male", dateOfBirth: "1985-11-15", nationality: "American", nationalId: "571382940", address: "120 Broadway", city: "New York", country: "USA" },
    2:  { gender: "Female", dateOfBirth: "1983-07-08", nationality: "British", nationalId: "AB123456C", address: "12 Baker St", city: "London", country: "UK" },
    3:  { gender: "Male", dateOfBirth: "1990-02-14", nationality: "Israeli", nationalId: "206879140", address: "8 Rothschild Blvd", city: "Tel Aviv", country: "Israel" },
    4:  { gender: "Male", dateOfBirth: "1988-09-30", nationality: "American", nationalId: "629447182", address: "200 West St", city: "New York", country: "USA" },
    5:  { gender: "Female", dateOfBirth: "1992-04-20", nationality: "Indian", nationalId: "AAPL91205K", address: "55 Tech Park", city: "New York", country: "USA" },
    6:  { gender: "Male", dateOfBirth: "1995-12-05", nationality: "Indian", nationalId: "BKPR83410J", address: "10 Digital Way", city: "Berlin", country: "Germany" },
    7:  { gender: "Female", dateOfBirth: "1987-06-25", nationality: "British", nationalId: "CD789012E", address: "34 Innovation St", city: "London", country: "UK" },
    8:  { gender: "Male", dateOfBirth: "1991-01-20", nationality: "Brazilian", nationalId: "41293856102", address: "56 Tech Lane", city: "London", country: "UK" },
    9:  { gender: "Female", dateOfBirth: "1996-08-12", nationality: "Italian", nationalId: "RSSBLM96M52H501Z", address: "22 Future Rd", city: "Sydney", country: "Australia" },
    10: { gender: "Male", dateOfBirth: "1984-05-17", nationality: "Israeli", nationalId: "305142897", address: "15 Herzl St", city: "Tel Aviv", country: "Israel" },
    11: { gender: "Female", dateOfBirth: "1993-10-28", nationality: "Bulgarian", nationalId: "9310284521", address: "7 Tech Park", city: "Tel Aviv", country: "Israel" },
    12: { gender: "Male", dateOfBirth: "1989-03-09", nationality: "American", nationalId: "738526194", address: "88 Oxford St", city: "London", country: "UK" },
    13: { gender: "Female", dateOfBirth: "1994-11-22", nationality: "French", nationalId: "294117803521", address: "45 Kings Rd", city: "London", country: "UK" },
    14: { gender: "Male", dateOfBirth: "1986-07-14", nationality: "Mexican", nationalId: "MERC860714HDFRRL09", address: "30 Jaffa Rd", city: "Tel Aviv", country: "Israel" },
    15: { gender: "Female", dateOfBirth: "1997-04-16", nationality: "Japanese", nationalId: "472189035612", address: "18 Harbour St", city: "Sydney", country: "Australia" },
    16: { gender: "Female", dateOfBirth: "1985-08-19", nationality: "American", nationalId: "841275093", address: "60 Unter den Linden", city: "Berlin", country: "Germany" },
    17: { gender: "Male", dateOfBirth: "1993-04-07", nationality: "German", nationalId: "T820419307481", address: "25 Friedrichstr", city: "Berlin", country: "Germany" },
    18: { gender: "Female", dateOfBirth: "1994-06-30", nationality: "Korean", nationalId: "9406302048371", address: "300 5th Ave", city: "New York", country: "USA" },
    19: { gender: "Male", dateOfBirth: "1982-12-11", nationality: "American", nationalId: "394678201", address: "150 Broadway", city: "New York", country: "USA" },
    20: { gender: "Female", dateOfBirth: "1990-09-15", nationality: "American", nationalId: "512834769", address: "75 Wall St", city: "New York", country: "USA" },
    21: { gender: "Male", dateOfBirth: "1995-01-28", nationality: "Swedish", nationalId: "9501284382", address: "40 Alexanderplatz", city: "Berlin", country: "Germany" },
    22: { gender: "Female", dateOfBirth: "1980-05-06", nationality: "American", nationalId: "267915438", address: "90 Madison Ave", city: "New York", country: "USA" },
    23: { gender: "Female", dateOfBirth: "1991-07-19", nationality: "British", nationalId: "EF345678G", address: "22 Regent St", city: "London", country: "UK" },
    24: { gender: "Male", dateOfBirth: "1979-10-03", nationality: "American", nationalId: "183467920", address: "110 Wall St", city: "New York", country: "USA" },
    25: { gender: "Female", dateOfBirth: "1993-03-25", nationality: "American", nationalId: "645183097", address: "65 Park Ave", city: "New York", country: "USA" },
    26: { gender: "Male", dateOfBirth: "1986-11-08", nationality: "American", nationalId: "927346158", address: "40 Lexington Ave", city: "New York", country: "USA" },
    27: { gender: "Female", dateOfBirth: "2001-09-14", nationality: "American", nationalId: "758421063", address: "25 Union Sq", city: "New York", country: "USA" },
  };

  // Add salary history for employees who don't have one in salaryMap
  const defaultSalaryMap: Record<number, Array<{ effectiveDate: string; contractType: string; salaryType: string; salaryAmount: string; salaryCurrency: string; note: string }>> = {
    3:  [ // Alex Rivera — VP Design
      { effectiveDate: "2018-01-08", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "145000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2021-01-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "175000", salaryCurrency: "USD", note: "Promoted to VP" },
    ],
    10: [ // Ryan Torres — Engineering Manager
      { effectiveDate: "2017-11-13", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "128000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2021-11-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "148000", salaryCurrency: "USD", note: "Annual review" },
    ],
    11: [ // Natalia Koleva — DevOps Engineer
      { effectiveDate: "2020-02-10", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "105000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2023-02-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "118000", salaryCurrency: "USD", note: "Annual review" },
    ],
    12: [ // Marcus Johnson — Senior Product Manager
      { effectiveDate: "2019-03-18", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "125000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2022-03-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "140000", salaryCurrency: "USD", note: "Senior promotion" },
    ],
    13: [ // Sophie Martin — Product Analyst
      { effectiveDate: "2020-08-24", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "82000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2023-08-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "92000", salaryCurrency: "USD", note: "Annual review" },
    ],
    15: [ // Yuki Tanaka — UI Designer
      { effectiveDate: "2021-01-11", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "78000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2024-01-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "88000", salaryCurrency: "USD", note: "Annual review" },
    ],
    16: [ // Rebecca Hall — Marketing Manager
      { effectiveDate: "2018-05-14", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "105000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2022-05-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "122000", salaryCurrency: "USD", note: "Annual review" },
    ],
    17: [ // Thomas Weber — Content Writer
      { effectiveDate: "2020-09-07", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "65000", salaryCurrency: "EUR", note: "Initial hire" },
      { effectiveDate: "2023-09-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "72000", salaryCurrency: "EUR", note: "Annual review" },
    ],
    18: [ // Amelia Lee — Growth Marketing Specialist
      { effectiveDate: "2021-03-22", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "75000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2024-03-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "85000", salaryCurrency: "USD", note: "Annual review" },
    ],
    20: [ // Diana Foster — Account Executive
      { effectiveDate: "2019-04-09", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "80000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2022-04-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "95000", salaryCurrency: "USD", note: "Annual review" },
    ],
    21: [ // Erik Anderson — Sales Development Rep
      { effectiveDate: "2020-10-19", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "60000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2023-10-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "68000", salaryCurrency: "USD", note: "Annual review" },
    ],
    24: [ // Jessica White — Recruiter
      { effectiveDate: "2019-11-04", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "72000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2023-01-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "82000", salaryCurrency: "USD", note: "Annual review" },
    ],
    27: [ // William Turner — Operations Manager
      { effectiveDate: "2018-10-08", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "98000", salaryCurrency: "USD", note: "Initial hire" },
      { effectiveDate: "2022-10-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "115000", salaryCurrency: "USD", note: "Annual review" },
    ],
    28: [ // Zoey Sanders — HR Intern
      { effectiveDate: "2023-06-01", contractType: "Intern", salaryType: "Base Salary", salaryAmount: "42000", salaryCurrency: "USD", note: "Internship" },
    ],
  };

  // Merge defaultSalaryMap into salaryMap (salaryMap takes priority)
  for (const [k, v] of Object.entries(defaultSalaryMap)) {
    if (!salaryMap[Number(k)]) salaryMap[Number(k)] = v;
  }

  const employees = await Promise.all(
    empData.map((e, idx) => prisma.employee.create({
      data: {
        companyId: company.id, email: e.email, firstName: e.first, lastName: e.last,
        displayName: e.first + " " + e.last, status: "ACTIVE", employmentType: e.type,
        startDate: new Date(e.start), departmentId: e.dept,
        siteId: sites[e.site].id, ...(e.team !== null ? { teamId: teams[e.team].id } : {}),
        personalInfo: JSON.stringify({ phone: "+1-555-0100", ...(personalInfoMap[idx] ?? {}) }),
        workInfo: JSON.stringify({ jobTitle: e.title, ...(salaryMap[idx] ? { salaryHistory: salaryMap[idx] } : {}) }),
      },
    }))
  );

  // Terminated employees
  await Promise.all([
    prisma.employee.create({ data: {
      companyId: company.id, email: "daniel.morgan@acme.tech",
      firstName: "Daniel", lastName: "Morgan", displayName: "Daniel Morgan",
      status: "TERMINATED", employmentType: "FULL_TIME",
      startDate: new Date("2019-02-11"), endDate: new Date("2025-09-15"),
      departmentId: engDept.id, siteId: sites[0].id,
      personalInfo: JSON.stringify({ phone: "+1-555-0201", gender: "Male", dateOfBirth: "1991-06-12", nationalId: "381927456" }),
      workInfo: JSON.stringify({ jobTitle: "Senior Backend Engineer", terminationReason: "Resignation",
        salaryHistory: [
          { effectiveDate: "2019-02-11", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "108000", salaryCurrency: "USD", note: "Initial hire" },
          { effectiveDate: "2022-02-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "125000", salaryCurrency: "USD", note: "Annual review" },
        ],
      }),
    }}),
    prisma.employee.create({ data: {
      companyId: company.id, email: "laura.kim@acme.tech",
      firstName: "Laura", lastName: "Kim", displayName: "Laura Kim",
      status: "TERMINATED", employmentType: "FULL_TIME",
      startDate: new Date("2020-07-06"), endDate: new Date("2025-12-31"),
      departmentId: markDept.id, siteId: sites[3].id,
      personalInfo: JSON.stringify({ phone: "+49-555-0202", gender: "Female", dateOfBirth: "1992-03-18", nationalId: "K920318L4521" }),
      workInfo: JSON.stringify({ jobTitle: "Growth Marketing Manager", terminationReason: "Layoff",
        salaryHistory: [
          { effectiveDate: "2020-07-06", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "82000", salaryCurrency: "EUR", note: "Initial hire" },
          { effectiveDate: "2022-07-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "92000", salaryCurrency: "EUR", note: "Annual review" },
        ],
      }),
    }}),
    prisma.employee.create({ data: {
      companyId: company.id, email: "ben.fischer@acme.tech",
      firstName: "Ben", lastName: "Fischer", displayName: "Ben Fischer",
      status: "TERMINATED", employmentType: "FULL_TIME",
      startDate: new Date("2021-03-15"), endDate: new Date("2026-01-31"),
      departmentId: salesDept.id, siteId: sites[0].id,
      personalInfo: JSON.stringify({ phone: "+1-555-0203", gender: "Male", dateOfBirth: "1994-08-22", nationalId: "504831297" }),
      workInfo: JSON.stringify({ jobTitle: "Account Executive", terminationReason: "Performance",
        salaryHistory: [
          { effectiveDate: "2021-03-15", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "72000", salaryCurrency: "USD", note: "Initial hire" },
        ],
      }),
    }}),
    prisma.employee.create({ data: {
      companyId: company.id, email: "nina.okafor@acme.tech",
      firstName: "Nina", lastName: "Okafor", displayName: "Nina Okafor",
      status: "TERMINATED", employmentType: "CONTRACT",
      startDate: new Date("2022-01-10"), endDate: new Date("2025-07-15"),
      departmentId: prodDept.id, siteId: sites[1].id,
      personalInfo: JSON.stringify({ phone: "+44-555-0204", gender: "Female", dateOfBirth: "1990-11-05", nationalId: "GH901234F" }),
      workInfo: JSON.stringify({ jobTitle: "Product Manager", terminationReason: "Contract End",
        salaryHistory: [
          { effectiveDate: "2022-01-10", contractType: "Contract", salaryType: "Base Salary", salaryAmount: "95000", salaryCurrency: "GBP", note: "Contract start" },
        ],
      }),
    }}),
    prisma.employee.create({ data: {
      companyId: company.id, email: "andrei.popescu@acme.tech",
      firstName: "Andrei", lastName: "Popescu", displayName: "Andrei Popescu",
      status: "TERMINATED", employmentType: "FULL_TIME",
      startDate: new Date("2017-05-22"), endDate: new Date("2025-11-30"),
      departmentId: finDept.id, siteId: sites[2].id,
      personalInfo: JSON.stringify({ phone: "+972-555-0205", gender: "Male", dateOfBirth: "1988-04-15", nationalId: "412058736" }),
      workInfo: JSON.stringify({ jobTitle: "Senior Financial Analyst", terminationReason: "Resignation",
        salaryHistory: [
          { effectiveDate: "2017-05-22", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "80000", salaryCurrency: "ILS", note: "Initial hire" },
          { effectiveDate: "2020-05-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "96000", salaryCurrency: "ILS", note: "Senior promotion" },
          { effectiveDate: "2023-05-01", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "110000", salaryCurrency: "ILS", note: "Annual review" },
        ],
      }),
    }}),
    prisma.employee.create({ data: {
      companyId: company.id, email: "chloe.dupont@acme.tech",
      firstName: "Chloe", lastName: "Dupont", displayName: "Chloe Dupont",
      status: "TERMINATED", employmentType: "FULL_TIME",
      startDate: new Date("2023-04-03"), endDate: new Date("2026-02-15"),
      departmentId: hrDept.id, siteId: sites[1].id,
      personalInfo: JSON.stringify({ phone: "+44-555-0206", gender: "Female", dateOfBirth: "1995-01-28", nationalId: "HJ567890K" }),
      workInfo: JSON.stringify({ jobTitle: "HR Business Partner", terminationReason: "Mutual Agreement",
        salaryHistory: [
          { effectiveDate: "2023-04-03", contractType: "Full-time", salaryType: "Base Salary", salaryAmount: "68000", salaryCurrency: "GBP", note: "Initial hire" },
        ],
      }),
    }}),
  ]);

  // Set up manager relationships
  const mgrMap = [[1,0],[2,0],[3,0],[4,1],[5,4],[6,4],[7,1],[8,7],[9,7],[10,1],[11,10],[12,2],[13,2],[14,3],[15,14],[16,0],[17,16],[18,16],[19,0],[20,19],[21,19],[22,0],[23,22],[24,0],[25,24],[26,0],[27,22]];
  await Promise.all(mgrMap.map(([emp, mgr]) =>
    prisma.employee.update({ where: { id: employees[emp].id }, data: { managerId: employees[mgr].id } })
  ));

  // Create admin employee so admin user has a companyId in session
  const adminEmployee = await prisma.employee.create({
    data: {
      id: 'admin-employee-seed',
      companyId: company.id,
      email: 'admin@acme.tech',
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Admin User',
      status: 'ACTIVE',
      employmentType: 'FULL_TIME',
      startDate: new Date('2015-01-01'),
      departmentId: hrDept.id,
      personalInfo: JSON.stringify({}),
      workInfo: JSON.stringify({ jobTitle: 'System Administrator' }),
    },
  });

  // Create Users
  const adminPasswordHash = await bcrypt.hash("password123", 10);
  const employeePassword = await bcrypt.hash("password123", 10);
  await prisma.user.create({ data: { email: "admin@acme.tech", passwordHash: adminPasswordHash, role: "SUPER_ADMIN", employeeId: adminEmployee.id } });

  // Make all HR department employees ADMIN
  const hrEmployees = await prisma.employee.findMany({ where: { departmentId: hrDept.id } });
  for (const hrEmp of hrEmployees) {
    await prisma.user.updateMany({ where: { employeeId: hrEmp.id }, data: { role: "ADMIN" } });
  }
  await Promise.all(employees.map(emp =>
    prisma.user.create({ data: { email: emp.email, passwordHash: employeePassword, role: "EMPLOYEE", employeeId: emp.id } })
  ));

  // Create Time Off Policies
  const policies = await Promise.all([
    prisma.timeOffPolicy.create({ data: { companyId: company.id, name: "Vacation", type: "VACATION", color: "#3b82f6", accrualRate: 2.083, maxCarryOver: 5, allowNegative: true } }),
    prisma.timeOffPolicy.create({ data: { companyId: company.id, name: "Sick Leave", type: "SICK", color: "#f97316", accrualRate: 0.833, maxCarryOver: 10, allowNegative: true } }),
  ]);

  // Create Time Off Requests
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const torData = [
    // Current Month (April)
    { emp: 7, pol: 0, start: today, end: new Date(currentYear, currentMonth, 25), days: 15, status: "PENDING", reason: "April Break" },
    { emp: 4, pol: 0, start: new Date(currentYear, currentMonth, 10), end: new Date(currentYear, currentMonth, 14), days: 5, status: "APPROVED", reason: "Quick Trip", revBy: 1, revAt: new Date() },
    
    // May
    { emp: 7, pol: 0, start: new Date(currentYear, currentMonth + 1, 10), end: new Date(currentYear, currentMonth + 1, 20), days: 10, status: "APPROVED", reason: "May Vacation", revBy: 0, revAt: new Date() },
    { emp: 1, pol: 0, start: new Date(currentYear, currentMonth + 1, 1), end: new Date(currentYear, currentMonth + 1, 5), days: 5, status: "PENDING", reason: "Spring Break" },

    // June
    { emp: 7, pol: 0, start: new Date(currentYear, currentMonth + 2, 15), end: new Date(currentYear, currentMonth + 2, 25), days: 10, status: "APPROVED", reason: "June Holiday", revBy: 0, revAt: new Date() },

    // July (Matching your screenshot)
    { emp: 7, pol: 0, start: new Date(currentYear, currentMonth + 3, 5), end: new Date(currentYear, currentMonth + 3, 15), days: 10, status: "APPROVED", reason: "Summer in July", revBy: 0, revAt: new Date() },
    { emp: 2, pol: 0, start: new Date(currentYear, currentMonth + 3, 20), end: new Date(currentYear, currentMonth + 3, 25), days: 5, status: "PENDING", reason: "Beach Trip" },

    // Others — more variety
    { emp: 24, pol: 1, start: new Date(currentYear, currentMonth, 8), end: new Date(currentYear, currentMonth, 8), days: 1, status: "APPROVED", reason: "Sick day", revBy: 0, revAt: new Date() },
    { emp: 5, pol: 0, start: new Date(currentYear, currentMonth, 15), end: new Date(currentYear, currentMonth, 18), days: 4, status: "APPROVED", reason: "Family visit", revBy: 4, revAt: new Date() },
    { emp: 9, pol: 0, start: new Date(currentYear, currentMonth, 22), end: new Date(currentYear, currentMonth, 22), days: 1, status: "APPROVED", reason: "Moving day", revBy: 7, revAt: new Date() },
    { emp: 12, pol: 0, start: new Date(currentYear, currentMonth + 1, 5), end: new Date(currentYear, currentMonth + 1, 9), days: 5, status: "PENDING", reason: "Conference trip" },
    { emp: 14, pol: 0, start: new Date(currentYear, currentMonth + 1, 15), end: new Date(currentYear, currentMonth + 1, 23), days: 7, status: "APPROVED", reason: "Summer holiday", revBy: 3, revAt: new Date() },
    { emp: 16, pol: 1, start: new Date(currentYear, currentMonth, 3), end: new Date(currentYear, currentMonth, 4), days: 2, status: "APPROVED", reason: "Flu", revBy: 0, revAt: new Date() },
    { emp: 19, pol: 0, start: new Date(currentYear, currentMonth + 2, 1), end: new Date(currentYear, currentMonth + 2, 5), days: 5, status: "PENDING", reason: "Road trip" },
    { emp: 21, pol: 0, start: new Date(currentYear, currentMonth, 28), end: new Date(currentYear, currentMonth, 28), days: 1, status: "APPROVED", reason: "Birthday", revBy: 19, revAt: new Date() },
    { emp: 8, pol: 0, start: new Date(currentYear, currentMonth + 1, 20), end: new Date(currentYear, currentMonth + 1, 30), days: 8, status: "APPROVED", reason: "Back home to Brazil", revBy: 7, revAt: new Date() },
    { emp: 11, pol: 1, start: new Date(currentYear, currentMonth, 12), end: new Date(currentYear, currentMonth, 12), days: 1, status: "APPROVED", reason: "Doctor appointment", revBy: 10, revAt: new Date() },
    { emp: 17, pol: 0, start: new Date(currentYear, currentMonth + 2, 10), end: new Date(currentYear, currentMonth + 2, 14), days: 5, status: "PENDING", reason: "Visit family in Germany" },
    { emp: 22, pol: 0, start: new Date(currentYear, currentMonth + 1, 12), end: new Date(currentYear, currentMonth + 1, 16), days: 5, status: "APPROVED", reason: "Anniversary trip", revBy: 0, revAt: new Date() },

    // More current month — overlapping days to test "+N more" on calendar
    { emp: 0, pol: 0, start: new Date(currentYear, currentMonth, 14), end: new Date(currentYear, currentMonth, 18), days: 5, status: "APPROVED", reason: "CEO retreat", revBy: 22, revAt: new Date() },
    { emp: 3, pol: 0, start: new Date(currentYear, currentMonth, 15), end: new Date(currentYear, currentMonth, 15), days: 1, status: "APPROVED", reason: "Personal errand", revBy: 0, revAt: new Date() },
    { emp: 10, pol: 0, start: new Date(currentYear, currentMonth, 14), end: new Date(currentYear, currentMonth, 16), days: 3, status: "APPROVED", reason: "Short trip", revBy: 1, revAt: new Date() },
    { emp: 13, pol: 0, start: new Date(currentYear, currentMonth, 21), end: new Date(currentYear, currentMonth, 25), days: 5, status: "PENDING", reason: "Spring break" },
    { emp: 15, pol: 1, start: new Date(currentYear, currentMonth, 7), end: new Date(currentYear, currentMonth, 8), days: 2, status: "APPROVED", reason: "Not feeling well", revBy: 14, revAt: new Date() },
    { emp: 18, pol: 0, start: new Date(currentYear, currentMonth, 10), end: new Date(currentYear, currentMonth, 11), days: 2, status: "APPROVED", reason: "Wedding", revBy: 16, revAt: new Date() },
    { emp: 20, pol: 0, start: new Date(currentYear, currentMonth, 15), end: new Date(currentYear, currentMonth, 17), days: 3, status: "PENDING", reason: "Long weekend getaway" },
    { emp: 25, pol: 0, start: new Date(currentYear, currentMonth, 22), end: new Date(currentYear, currentMonth, 22), days: 1, status: "APPROVED", reason: "DMV appointment", revBy: 24, revAt: new Date() },
    { emp: 6, pol: 0, start: new Date(currentYear, currentMonth, 7), end: new Date(currentYear, currentMonth, 11), days: 5, status: "APPROVED", reason: "Berlin staycation", revBy: 4, revAt: new Date() },
    { emp: 26, pol: 0, start: new Date(currentYear, currentMonth, 21), end: new Date(currentYear, currentMonth, 22), days: 2, status: "APPROVED", reason: "Moving offices", revBy: 0, revAt: new Date() },
  ];

  // Add time-off requests for the admin user so they show in "My Requests"
  await Promise.all([
    prisma.timeOffRequest.create({ data: { employeeId: 'admin-employee-seed', policyId: policies[0].id, startDate: new Date(currentYear, currentMonth + 1, 5), endDate: new Date(currentYear, currentMonth + 1, 9), days: 5, status: "APPROVED", reason: "Admin vacation", reviewedBy: employees[0].id, reviewedAt: new Date() } }),
    prisma.timeOffRequest.create({ data: { employeeId: 'admin-employee-seed', policyId: policies[0].id, startDate: new Date(currentYear, currentMonth + 2, 1), endDate: new Date(currentYear, currentMonth + 2, 3), days: 3, status: "PENDING", reason: "Long weekend" } }),
    prisma.timeOffRequest.create({ data: { employeeId: 'admin-employee-seed', policyId: policies[1].id, startDate: new Date(currentYear, currentMonth, 20), endDate: new Date(currentYear, currentMonth, 20), days: 1, status: "APPROVED", reason: "Doctor visit", reviewedBy: employees[0].id, reviewedAt: new Date() } }),
  ]);
  await Promise.all(torData.map(t =>
    prisma.timeOffRequest.create({
      data: {
        employeeId: employees[t.emp].id, policyId: policies[t.pol].id,
        startDate: t.start, endDate: t.end, days: t.days,
        status: t.status, reason: t.reason,
        ...(t.revBy !== undefined ? { reviewedBy: employees[t.revBy].id, reviewedAt: t.revAt } : {}),
      },
    })
  ));

  // Create Job Postings
  const jobPostings = await Promise.all([
    prisma.jobPosting.create({ data: { companyId: company.id, title: "Senior Backend Engineer", departmentId: engDept.id, siteId: sites[0].id, description: "Looking for an experienced backend engineer.", requirements: "5+ years Node.js, PostgreSQL", salaryMin: 120000, salaryMax: 160000, currency: "USD", status: "PUBLISHED", publishedAt: new Date("2024-02-01") } }),
    prisma.jobPosting.create({ data: { companyId: company.id, title: "Frontend Engineer", departmentId: engDept.id, siteId: sites[1].id, description: "Join our frontend team.", requirements: "3+ years React, TypeScript", salaryMin: 100000, salaryMax: 140000, currency: "USD", status: "PUBLISHED", publishedAt: new Date("2024-02-15") } }),
    prisma.jobPosting.create({ data: { companyId: company.id, title: "Product Manager", departmentId: prodDept.id, siteId: sites[1].id, description: "Lead product strategy.", requirements: "5+ years PM in B2B SaaS", salaryMin: 130000, salaryMax: 170000, currency: "USD", status: "PUBLISHED", publishedAt: new Date("2024-01-15") } }),
    prisma.jobPosting.create({ data: { companyId: company.id, title: "UX Designer", departmentId: desDept.id, siteId: sites[2].id, description: "Design intuitive interfaces.", requirements: "3+ years UX, Figma", salaryMin: 90000, salaryMax: 130000, currency: "USD", status: "PUBLISHED", publishedAt: new Date("2024-03-01") } }),
    prisma.jobPosting.create({ data: { companyId: company.id, title: "Account Executive", departmentId: salesDept.id, siteId: sites[0].id, description: "Manage enterprise clients.", requirements: "3+ years enterprise SaaS sales", salaryMin: 80000, salaryMax: 150000, currency: "USD", status: "DRAFT" } }),
  ]);

  // Create Candidates
  const candData = [
    { job: 0, first: "John", last: "Doe", email: "john.doe@email.com", phone: "+1-555-0201", stage: "APPLIED", source: "LinkedIn", rating: 4 },
    { job: 0, first: "Jane", last: "Smith", email: "jane.smith@email.com", phone: "+1-555-0202", stage: "SCREENING", source: "Referral", rating: 4.5 },
    { job: 0, first: "Michael", last: "Johnson", email: "michael.j@email.com", stage: "INTERVIEW", source: "Job Board", rating: 4.2 },
    { job: 0, first: "Sarah", last: "Williams", email: "sarah.w@email.com", stage: "ASSESSMENT", rating: 4.1 },
    { job: 1, first: "Alex", last: "Brown", email: "alex.b@email.com", phone: "+44-555-0203", stage: "APPLIED", source: "LinkedIn", rating: 3.8 },
    { job: 1, first: "Emily", last: "Davis", email: "emily.d@email.com", phone: "+44-555-0204", stage: "SCREENING", source: "Referral", rating: 4.6 },
    { job: 1, first: "David", last: "Miller", email: "david.m@email.com", stage: "INTERVIEW", rating: 4.0 },
    { job: 2, first: "Lisa", last: "Anderson", email: "lisa.a@email.com", phone: "+44-555-0205", stage: "INTERVIEW", source: "Recruiter", rating: 4.7 },
    { job: 2, first: "Robert", last: "Taylor", email: "robert.t@email.com", stage: "ASSESSMENT", rating: 4.3 },
    { job: 2, first: "Jennifer", last: "Martinez", email: "jennifer.m@email.com", stage: "OFFER", rating: 4.8 },
    { job: 3, first: "Thomas", last: "Garcia", email: "thomas.g@email.com", phone: "+972-555-0206", stage: "APPLIED", source: "Dribbble", rating: 4.4 },
    { job: 3, first: "Maria", last: "Rodriguez", email: "maria.r@email.com", stage: "SCREENING", source: "Job Board", rating: 4.5 },
    { job: 3, first: "Christopher", last: "Lee", email: "chris.l@email.com", stage: "INTERVIEW", rating: 4.2 },
    { job: 4, first: "Amanda", last: "White", email: "amanda.w@email.com", phone: "+1-555-0207", stage: "APPLIED", source: "LinkedIn", rating: 4.0 },
    { job: 4, first: "Paul", last: "Harris", email: "paul.h@email.com", stage: "REJECTED", rating: 2.5 },
  ];
  await Promise.all(candData.map(c =>
    prisma.candidate.create({
      data: { jobId: jobPostings[c.job].id, firstName: c.first, lastName: c.last, email: c.email, ...(c.phone ? { phone: c.phone } : {}), stage: c.stage, ...(c.source ? { source: c.source } : {}), rating: c.rating, notes: JSON.stringify([]) },
    })
  ));

  // Create Review Cycle
  const reviewCycle = await prisma.reviewCycle.create({
    data: { companyId: company.id, name: "2024 Annual Performance Review", type: "ANNUAL", startDate: new Date("2024-01-01"), endDate: new Date("2024-03-31"), status: "ACTIVE",
      template: JSON.stringify({ sections: ["Technical Skills","Communication","Teamwork","Leadership","Self-development"] }),
    },
  });

  // Create Performance Reviews
  await Promise.all([
    prisma.performanceReview.create({ data: { cycleId: reviewCycle.id, employeeId: employees[5].id, reviewerId: employees[4].id, type: "MANAGER", status: "SUBMITTED", rating: 4.5, responses: JSON.stringify({ technicalSkills: "Excellent", communication: "Very Good", teamwork: "Excellent" }), submittedAt: new Date("2024-02-15") } }),
    prisma.performanceReview.create({ data: { cycleId: reviewCycle.id, employeeId: employees[8].id, reviewerId: employees[7].id, type: "MANAGER", status: "IN_PROGRESS", responses: JSON.stringify({ technicalSkills: "Very Good" }) } }),
    prisma.performanceReview.create({ data: { cycleId: reviewCycle.id, employeeId: employees[12].id, reviewerId: employees[2].id, type: "MANAGER", status: "PENDING" } }),
    prisma.performanceReview.create({ data: { cycleId: reviewCycle.id, employeeId: employees[5].id, reviewerId: employees[5].id, type: "SELF", status: "SUBMITTED", responses: JSON.stringify({ technicalSkills: "Good" }), submittedAt: new Date("2024-02-10") } }),
    prisma.performanceReview.create({ data: { cycleId: reviewCycle.id, employeeId: employees[14].id, reviewerId: employees[3].id, type: "MANAGER", status: "SUBMITTED", rating: 4.7, responses: JSON.stringify({ technicalSkills: "Excellent", leadership: "Excellent" }), submittedAt: new Date("2024-02-20") } }),
  ]);

  // Create Goals
  const goals = await Promise.all([
    prisma.goal.create({ data: { companyId: company.id, employeeId: employees[5].id, title: "Improve API Response Times", description: "Reduce average API response time by 30%", type: "INDIVIDUAL", status: "ACTIVE", progress: 65, startDate: new Date("2024-01-01"), dueDate: new Date("2024-06-30") } }),
    prisma.goal.create({ data: { companyId: company.id, employeeId: employees[8].id, title: "Complete React Course", description: "Deepen React and hooks knowledge", type: "INDIVIDUAL", status: "ACTIVE", progress: 40, startDate: new Date("2024-02-01"), dueDate: new Date("2024-08-31") } }),
    prisma.goal.create({ data: { companyId: company.id, title: "Launch New Dashboard", description: "Complete redesign of admin dashboard", type: "TEAM", status: "ACTIVE", progress: 50, startDate: new Date("2024-01-15"), dueDate: new Date("2024-09-30") } }),
    prisma.goal.create({ data: { companyId: company.id, title: "Improve Customer Satisfaction", description: "Increase NPS score by 15 points", type: "DEPARTMENT", status: "ACTIVE", progress: 30, startDate: new Date("2024-01-01"), dueDate: new Date("2024-12-31") } }),
    prisma.goal.create({ data: { companyId: company.id, title: "Expand to Asian Market", description: "Establish operations in Asia", type: "COMPANY", status: "ACTIVE", progress: 20, startDate: new Date("2024-01-01"), dueDate: new Date("2025-12-31") } }),
    prisma.goal.create({ data: { companyId: company.id, employeeId: employees[14].id, title: "Design System Completion", description: "Establish comprehensive design system", type: "INDIVIDUAL", status: "ACTIVE", progress: 75, startDate: new Date("2024-01-01"), dueDate: new Date("2024-06-30") } }),
    prisma.goal.create({ data: { companyId: company.id, employeeId: employees[12].id, title: "Product Roadmap Execution", description: "Execute Q1-Q2 product roadmap", type: "INDIVIDUAL", status: "ACTIVE", progress: 45, startDate: new Date("2024-01-01"), dueDate: new Date("2024-06-30") } }),
    prisma.goal.create({ data: { companyId: company.id, employeeId: employees[19].id, title: "Increase Sales by 40%", description: "Grow revenue through new enterprise clients", type: "INDIVIDUAL", status: "ACTIVE", progress: 35, startDate: new Date("2024-01-01"), dueDate: new Date("2024-12-31") } }),
    prisma.goal.create({ data: { companyId: company.id, employeeId: employees[17].id, title: "Publish Monthly Blog Posts", description: "Write and publish 1 blog post per month", type: "INDIVIDUAL", status: "ACTIVE", progress: 50, startDate: new Date("2024-01-01"), dueDate: new Date("2024-12-31") } }),
    prisma.goal.create({ data: { companyId: company.id, employeeId: employees[22].id, title: "Implement New HRIS System", description: "Select and implement modern HR information system", type: "INDIVIDUAL", status: "ACTIVE", progress: 25, startDate: new Date("2024-02-01"), dueDate: new Date("2024-12-31") } }),
  ]);

  // Create Key Results
  await Promise.all([
    prisma.keyResult.create({ data: { goalId: goals[0].id, title: "Reduce P95 latency", targetValue: 200, currentValue: 290, unit: "ms" } }),
    prisma.keyResult.create({ data: { goalId: goals[0].id, title: "Reduce database queries per request", targetValue: 5, currentValue: 7, unit: "queries" } }),
    prisma.keyResult.create({ data: { goalId: goals[1].id, title: "Complete 12 course modules", targetValue: 12, currentValue: 5, unit: "modules" } }),
    prisma.keyResult.create({ data: { goalId: goals[2].id, title: "Complete design specifications", targetValue: 100, currentValue: 50, unit: "%" } }),
    prisma.keyResult.create({ data: { goalId: goals[2].id, title: "Implement frontend components", targetValue: 100, currentValue: 50, unit: "%" } }),
    prisma.keyResult.create({ data: { goalId: goals[3].id, title: "Increase NPS score", targetValue: 70, currentValue: 55, unit: "points" } }),
    prisma.keyResult.create({ data: { goalId: goals[4].id, title: "Open office in Singapore", targetValue: 1, currentValue: 0, unit: "offices" } }),
    prisma.keyResult.create({ data: { goalId: goals[5].id, title: "Design system components", targetValue: 100, currentValue: 75, unit: "components" } }),
    prisma.keyResult.create({ data: { goalId: goals[6].id, title: "Complete product features", targetValue: 15, currentValue: 7, unit: "features" } }),
    prisma.keyResult.create({ data: { goalId: goals[7].id, title: "Close enterprise deals", targetValue: 10, currentValue: 3, unit: "deals" } }),
    prisma.keyResult.create({ data: { goalId: goals[8].id, title: "Publish blog posts", targetValue: 12, currentValue: 6, unit: "posts" } }),
    prisma.keyResult.create({ data: { goalId: goals[9].id, title: "Complete vendor evaluation", targetValue: 3, currentValue: 1, unit: "vendors" } }),
  ]);

  // Create Compensation Records
  await Promise.all([
    prisma.compensationRecord.create({ data: { employeeId: employees[0].id, effectiveDate: new Date("2023-01-01"), salary: 350000, currency: "USD", payFrequency: "MONTHLY", bonusAmount: 50000, changeReason: "Annual salary review", approvedBy: "BOARD" } }),
    prisma.compensationRecord.create({ data: { employeeId: employees[1].id, effectiveDate: new Date("2023-06-01"), salary: 220000, currency: "USD", payFrequency: "MONTHLY", bonusAmount: 30000, changeReason: "Promotion to VP", approvedBy: employees[0].id } }),
    prisma.compensationRecord.create({ data: { employeeId: employees[5].id, effectiveDate: new Date("2023-08-01"), salary: 140000, currency: "USD", payFrequency: "MONTHLY", bonusAmount: 15000, changeReason: "Merit increase", approvedBy: employees[1].id } }),
    prisma.compensationRecord.create({ data: { employeeId: employees[8].id, effectiveDate: new Date("2023-03-01"), salary: 120000, currency: "USD", payFrequency: "MONTHLY", bonusAmount: 12000, changeReason: "Hire", approvedBy: employees[1].id } }),
    prisma.compensationRecord.create({ data: { employeeId: employees[14].id, effectiveDate: new Date("2023-01-01"), salary: 130000, currency: "USD", payFrequency: "MONTHLY", bonusAmount: 15000, changeReason: "Annual review", approvedBy: employees[3].id } }),
  ]);

  // Create Salary Bands
  await Promise.all([
    prisma.salaryBand.create({ data: { companyId: company.id, jobFamily: "Engineering", level: "Senior", location: "New York", currency: "USD", minSalary: 130000, midSalary: 160000, maxSalary: 200000 } }),
    prisma.salaryBand.create({ data: { companyId: company.id, jobFamily: "Engineering", level: "Mid", location: "New York", currency: "USD", minSalary: 100000, midSalary: 125000, maxSalary: 150000 } }),
    prisma.salaryBand.create({ data: { companyId: company.id, jobFamily: "Product", level: "Senior", location: "London", currency: "GBP", minSalary: 110000, midSalary: 135000, maxSalary: 170000 } }),
  ]);

  // Create Surveys with proper question types
  const engagementQuestions = [
    { id: "q1", type: "RATING", title: "How satisfied are you with your current role?", required: true, maxRating: 5 },
    { id: "q2", type: "MULTIPLE_CHOICE", title: "How would you rate work-life balance at the company?", required: true, options: ["Excellent", "Good", "Average", "Below Average", "Poor"] },
    { id: "q3", type: "CHECKBOX", title: "Which benefits do you value most?", required: false, options: ["Health Insurance", "Flexible Hours", "Remote Work", "Learning Budget", "Team Events", "Stock Options"] },
    { id: "q4", type: "LONG_TEXT", title: "How would you describe the company culture?", required: false },
    { id: "q5", type: "RATING", title: "How likely are you to recommend this company as a workplace?", required: true, maxRating: 10 },
    { id: "q6", type: "MULTIPLE_CHOICE", title: "Do you feel your manager supports your growth?", required: true, options: ["Strongly Agree", "Agree", "Neutral", "Disagree", "Strongly Disagree"] },
    { id: "q7", type: "SHORT_TEXT", title: "What is one thing we could improve?", required: false },
  ];

  const pulseQuestions = [
    { id: "p1", type: "RATING", title: "How is your morale this week?", required: true, maxRating: 5 },
    { id: "p2", type: "MULTIPLE_CHOICE", title: "How would you describe your workload?", required: true, options: ["Too light", "Just right", "Slightly heavy", "Too heavy"] },
    { id: "p3", type: "SHORT_TEXT", title: "Any concerns or wins to share?", required: false },
  ];

  const remoteQuestions = [
    { id: "r1", type: "MULTIPLE_CHOICE", title: "How many days per week do you prefer to work from home?", required: true, options: ["0 (fully in-office)", "1-2 days", "3-4 days", "5 (fully remote)"] },
    { id: "r2", type: "RATING", title: "Rate your home office setup", required: true, maxRating: 5 },
    { id: "r3", type: "CHECKBOX", title: "What challenges do you face working remotely?", required: false, options: ["Internet connectivity", "Distractions", "Loneliness", "Communication gaps", "Time zone differences", "No challenges"] },
    { id: "r4", type: "LONG_TEXT", title: "What tools or support would help you work better remotely?", required: false },
  ];

  const surveys = await Promise.all([
    prisma.survey.create({ data: {
      companyId: company.id, creatorId: employees[22].id,
      title: "Q1 2026 Employee Engagement Survey", description: "Annual engagement survey to understand employee satisfaction and areas for improvement.",
      type: "ENGAGEMENT", status: "ACTIVE", anonymous: true,
      questions: JSON.stringify(engagementQuestions),
    }}),
    prisma.survey.create({ data: {
      companyId: company.id, creatorId: employees[22].id,
      title: "Weekly Pulse Check - April 2026", description: "Quick check-in on team morale and workload.",
      type: "PULSE", status: "ACTIVE", anonymous: true,
      questions: JSON.stringify(pulseQuestions),
    }}),
    prisma.survey.create({ data: {
      companyId: company.id, creatorId: employees[0].id,
      title: "Remote Work Policy Feedback", description: "Help us shape the future of our hybrid work policy.",
      type: "SURVEY", status: "COMPLETED", anonymous: false,
      questions: JSON.stringify(remoteQuestions),
    }}),
    prisma.survey.create({ data: {
      companyId: company.id, creatorId: employees[16].id,
      title: "Office Snacks & Perks Survey", description: "Tell us what snacks and perks you'd like in the office!",
      type: "SURVEY", status: "DRAFT", anonymous: true,
      questions: JSON.stringify([
        { id: "s1", type: "CHECKBOX", title: "What snacks would you like?", required: true, options: ["Fresh fruit", "Granola bars", "Chips", "Chocolate", "Nuts", "Yogurt"] },
        { id: "s2", type: "SHORT_TEXT", title: "Any other snack requests?", required: false },
        { id: "s3", type: "RATING", title: "How important are office perks to you?", required: true, maxRating: 5 },
      ]),
    }}),
  ]);

  // Create Survey Responses
  await Promise.all([
    // Engagement Survey — 8 responses
    prisma.surveyResponse.create({ data: { surveyId: surveys[0].id, answers: JSON.stringify({ q1: 4, q2: "Good", q3: ["Health Insurance", "Flexible Hours", "Remote Work"], q4: "Great team culture, very supportive", q5: 8, q6: "Agree", q7: "More cross-team collaboration" }), submittedAt: new Date("2026-03-10") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[0].id, answers: JSON.stringify({ q1: 5, q2: "Excellent", q3: ["Health Insurance", "Stock Options", "Learning Budget"], q4: "Innovative and fast-paced", q5: 9, q6: "Strongly Agree", q7: "" }), submittedAt: new Date("2026-03-11") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[0].id, answers: JSON.stringify({ q1: 3, q2: "Average", q3: ["Flexible Hours", "Remote Work"], q4: "Good but needs better communication", q5: 6, q6: "Neutral", q7: "Better documentation" }), submittedAt: new Date("2026-03-12") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[0].id, answers: JSON.stringify({ q1: 4, q2: "Good", q3: ["Health Insurance", "Team Events", "Flexible Hours"], q4: "Fun and collaborative", q5: 8, q6: "Agree", q7: "More team outings" }), submittedAt: new Date("2026-03-13") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[0].id, answers: JSON.stringify({ q1: 5, q2: "Excellent", q3: ["Learning Budget", "Remote Work", "Stock Options"], q4: "Best place I've worked", q5: 10, q6: "Strongly Agree", q7: "" }), submittedAt: new Date("2026-03-14") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[0].id, answers: JSON.stringify({ q1: 2, q2: "Below Average", q3: ["Health Insurance"], q4: "Needs improvement in management transparency", q5: 5, q6: "Disagree", q7: "More transparency from leadership" }), submittedAt: new Date("2026-03-15") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[0].id, answers: JSON.stringify({ q1: 4, q2: "Good", q3: ["Flexible Hours", "Team Events", "Health Insurance"], q4: "Solid culture, great colleagues", q5: 8, q6: "Agree", q7: "Better onboarding" }), submittedAt: new Date("2026-03-16") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[0].id, answers: JSON.stringify({ q1: 3, q2: "Average", q3: ["Remote Work", "Learning Budget"], q4: "Decent but high workload sometimes", q5: 7, q6: "Neutral", q7: "Workload balance" }), submittedAt: new Date("2026-03-17") } }),

    // Pulse Survey — 5 responses
    prisma.surveyResponse.create({ data: { surveyId: surveys[1].id, answers: JSON.stringify({ p1: 5, p2: "Just right", p3: "Great week! Shipped the new feature." }), submittedAt: new Date("2026-04-07") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[1].id, answers: JSON.stringify({ p1: 4, p2: "Just right", p3: "No concerns this week" }), submittedAt: new Date("2026-04-07") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[1].id, answers: JSON.stringify({ p1: 3, p2: "Slightly heavy", p3: "Deadline pressure is building" }), submittedAt: new Date("2026-04-08") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[1].id, answers: JSON.stringify({ p1: 4, p2: "Just right", p3: "" }), submittedAt: new Date("2026-04-08") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[1].id, answers: JSON.stringify({ p1: 2, p2: "Too heavy", p3: "Need help with the migration project" }), submittedAt: new Date("2026-04-09") } }),

    // Remote Work Survey (completed, non-anonymous) — 6 responses
    prisma.surveyResponse.create({ data: { surveyId: surveys[2].id, employeeId: employees[5].id, answers: JSON.stringify({ r1: "3-4 days", r2: 4, r3: ["Communication gaps"], r4: "Better video conferencing setup" }), submittedAt: new Date("2026-02-15") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[2].id, employeeId: employees[8].id, answers: JSON.stringify({ r1: "1-2 days", r2: 5, r3: ["No challenges"], r4: "" }), submittedAt: new Date("2026-02-16") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[2].id, employeeId: employees[9].id, answers: JSON.stringify({ r1: "5 (fully remote)", r2: 3, r3: ["Internet connectivity", "Loneliness"], r4: "Co-working space budget" }), submittedAt: new Date("2026-02-16") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[2].id, employeeId: employees[14].id, answers: JSON.stringify({ r1: "3-4 days", r2: 4, r3: ["Time zone differences"], r4: "Async communication tools" }), submittedAt: new Date("2026-02-17") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[2].id, employeeId: employees[17].id, answers: JSON.stringify({ r1: "1-2 days", r2: 5, r3: ["No challenges"], r4: "" }), submittedAt: new Date("2026-02-18") } }),
    prisma.surveyResponse.create({ data: { surveyId: surveys[2].id, employeeId: employees[20].id, answers: JSON.stringify({ r1: "3-4 days", r2: 2, r3: ["Internet connectivity", "Distractions"], r4: "Noise-cancelling headphones stipend" }), submittedAt: new Date("2026-02-19") } }),
  ]);

  // Create Courses & Enrollments
  const coursesData = await Promise.all([
    prisma.course.create({ data: {
      companyId: company.id, creatorId: employees[1].id,
      title: "Leadership Fundamentals", description: "Essential leadership skills for new and aspiring managers. Learn to motivate teams, give feedback, and drive results.",
      category: "Leadership", duration: "8 hours", status: "PUBLISHED",
      lessons: JSON.stringify([
        { id: "lf1", title: "What Makes a Great Leader?", type: "VIDEO", url: "https://youtube.com/watch?v=example1", duration: "45 min" },
        { id: "lf2", title: "Setting Clear Expectations", type: "VIDEO", url: "https://youtube.com/watch?v=example2", duration: "30 min" },
        { id: "lf3", title: "Giving Effective Feedback", type: "ARTICLE", url: "https://hbr.org/feedback-guide", duration: "20 min" },
        { id: "lf4", title: "1:1 Meeting Best Practices", type: "DOCUMENT", url: "https://docs.google.com/1-1-template", duration: "15 min" },
        { id: "lf5", title: "Delegation & Empowerment", type: "VIDEO", url: "https://youtube.com/watch?v=example3", duration: "40 min" },
        { id: "lf6", title: "Handling Difficult Conversations", type: "VIDEO", url: "https://youtube.com/watch?v=example4", duration: "35 min" },
      ]),
    }}),
    prisma.course.create({ data: {
      companyId: company.id, creatorId: employees[22].id,
      title: "Data Privacy & Security Awareness", description: "Mandatory compliance training on data protection, GDPR, and security best practices.",
      category: "Compliance", duration: "2 hours", status: "PUBLISHED",
      lessons: JSON.stringify([
        { id: "dp1", title: "Introduction to Data Privacy", type: "VIDEO", url: "https://youtube.com/watch?v=privacy1", duration: "20 min" },
        { id: "dp2", title: "GDPR Overview", type: "ARTICLE", url: "https://gdpr.eu/what-is-gdpr", duration: "15 min" },
        { id: "dp3", title: "Password Security & 2FA", type: "VIDEO", url: "https://youtube.com/watch?v=security1", duration: "15 min" },
        { id: "dp4", title: "Phishing Awareness", type: "VIDEO", url: "https://youtube.com/watch?v=phishing1", duration: "20 min" },
        { id: "dp5", title: "Data Handling Policy", type: "DOCUMENT", url: "https://docs.google.com/data-policy", duration: "10 min" },
      ]),
    }}),
    prisma.course.create({ data: {
      companyId: company.id, creatorId: employees[8].id,
      title: "React & TypeScript Masterclass", description: "Deep dive into modern React patterns, hooks, TypeScript integration, and performance optimization.",
      category: "Technical", duration: "12 hours", status: "PUBLISHED",
      lessons: JSON.stringify([
        { id: "rt1", title: "TypeScript Fundamentals", type: "VIDEO", url: "https://youtube.com/watch?v=ts1", duration: "60 min" },
        { id: "rt2", title: "React Hooks Deep Dive", type: "VIDEO", url: "https://youtube.com/watch?v=hooks1", duration: "45 min" },
        { id: "rt3", title: "State Management Patterns", type: "VIDEO", url: "https://youtube.com/watch?v=state1", duration: "50 min" },
        { id: "rt4", title: "Server Components & Next.js", type: "ARTICLE", url: "https://nextjs.org/docs/app/building-your-application", duration: "30 min" },
        { id: "rt5", title: "Testing React Applications", type: "VIDEO", url: "https://youtube.com/watch?v=testing1", duration: "40 min" },
        { id: "rt6", title: "Performance Optimization", type: "VIDEO", url: "https://youtube.com/watch?v=perf1", duration: "35 min" },
        { id: "rt7", title: "Building Reusable Components", type: "LINK", url: "https://react.dev/learn/reusing-logic-with-custom-hooks", duration: "25 min" },
        { id: "rt8", title: "Final Project: Dashboard App", type: "DOCUMENT", url: "https://docs.google.com/react-project", duration: "120 min" },
      ]),
    }}),
    prisma.course.create({ data: {
      companyId: company.id, creatorId: employees[2].id,
      title: "Effective Communication", description: "Master the art of clear communication — presentations, emails, and cross-team collaboration.",
      category: "Soft Skills", duration: "4 hours", status: "PUBLISHED",
      lessons: JSON.stringify([
        { id: "ec1", title: "Active Listening", type: "VIDEO", url: "https://youtube.com/watch?v=listen1", duration: "25 min" },
        { id: "ec2", title: "Writing Clear Emails", type: "ARTICLE", url: "https://hbr.org/email-guide", duration: "15 min" },
        { id: "ec3", title: "Presentation Skills", type: "VIDEO", url: "https://youtube.com/watch?v=present1", duration: "35 min" },
        { id: "ec4", title: "Cross-Team Collaboration", type: "VIDEO", url: "https://youtube.com/watch?v=collab1", duration: "30 min" },
      ]),
    }}),
    prisma.course.create({ data: {
      companyId: company.id, creatorId: employees[14].id,
      title: "Design Thinking Workshop", description: "Learn the design thinking methodology: empathize, define, ideate, prototype, and test.",
      category: "Design", duration: "6 hours", status: "PUBLISHED",
      lessons: JSON.stringify([
        { id: "dt1", title: "Introduction to Design Thinking", type: "VIDEO", url: "https://youtube.com/watch?v=design1", duration: "30 min" },
        { id: "dt2", title: "User Research & Empathy Maps", type: "VIDEO", url: "https://youtube.com/watch?v=empathy1", duration: "40 min" },
        { id: "dt3", title: "Problem Definition & HMW", type: "ARTICLE", url: "https://designkit.org/methods", duration: "20 min" },
        { id: "dt4", title: "Ideation Techniques", type: "VIDEO", url: "https://youtube.com/watch?v=ideate1", duration: "35 min" },
        { id: "dt5", title: "Rapid Prototyping", type: "VIDEO", url: "https://youtube.com/watch?v=prototype1", duration: "45 min" },
      ]),
    }}),
    prisma.course.create({ data: {
      companyId: company.id, creatorId: employees[12].id,
      title: "Product Management 101", description: "Fundamentals of product management: roadmaps, user stories, prioritization frameworks, and stakeholder management.",
      category: "Product", duration: "5 hours", status: "PUBLISHED",
      lessons: JSON.stringify([
        { id: "pm1", title: "What Does a PM Do?", type: "VIDEO", url: "https://youtube.com/watch?v=pm1", duration: "25 min" },
        { id: "pm2", title: "Writing User Stories", type: "ARTICLE", url: "https://atlassian.com/agile/user-stories", duration: "15 min" },
        { id: "pm3", title: "Prioritization Frameworks (RICE, MoSCoW)", type: "VIDEO", url: "https://youtube.com/watch?v=prioritize1", duration: "35 min" },
        { id: "pm4", title: "Building a Product Roadmap", type: "DOCUMENT", url: "https://docs.google.com/roadmap-template", duration: "20 min" },
      ]),
    }}),
  ]);

  // Enrollments with various progress levels
  await Promise.all([
    // Leadership — several people enrolled, mixed progress
    prisma.enrollment.create({ data: { courseId: coursesData[0].id, employeeId: employees[4].id, progress: 100, completedLessons: JSON.stringify(["lf1","lf2","lf3","lf4","lf5","lf6"]), status: "COMPLETED", completedAt: new Date("2026-03-01") } }),
    prisma.enrollment.create({ data: { courseId: coursesData[0].id, employeeId: employees[7].id, progress: 67, completedLessons: JSON.stringify(["lf1","lf2","lf3","lf4"]), status: "IN_PROGRESS" } }),
    prisma.enrollment.create({ data: { courseId: coursesData[0].id, employeeId: employees[10].id, progress: 33, completedLessons: JSON.stringify(["lf1","lf2"]), status: "IN_PROGRESS" } }),
    prisma.enrollment.create({ data: { courseId: coursesData[0].id, employeeId: employees[19].id, progress: 50, completedLessons: JSON.stringify(["lf1","lf2","lf3"]), status: "IN_PROGRESS" } }),

    // Compliance — many enrolled (mandatory), most completed
    prisma.enrollment.create({ data: { courseId: coursesData[1].id, employeeId: employees[0].id, progress: 100, completedLessons: JSON.stringify(["dp1","dp2","dp3","dp4","dp5"]), status: "COMPLETED", completedAt: new Date("2026-02-10") } }),
    prisma.enrollment.create({ data: { courseId: coursesData[1].id, employeeId: employees[5].id, progress: 100, completedLessons: JSON.stringify(["dp1","dp2","dp3","dp4","dp5"]), status: "COMPLETED", completedAt: new Date("2026-02-12") } }),
    prisma.enrollment.create({ data: { courseId: coursesData[1].id, employeeId: employees[8].id, progress: 100, completedLessons: JSON.stringify(["dp1","dp2","dp3","dp4","dp5"]), status: "COMPLETED", completedAt: new Date("2026-02-14") } }),
    prisma.enrollment.create({ data: { courseId: coursesData[1].id, employeeId: employees[12].id, progress: 60, completedLessons: JSON.stringify(["dp1","dp2","dp3"]), status: "IN_PROGRESS" } }),
    prisma.enrollment.create({ data: { courseId: coursesData[1].id, employeeId: employees[16].id, progress: 80, completedLessons: JSON.stringify(["dp1","dp2","dp3","dp4"]), status: "IN_PROGRESS" } }),
    prisma.enrollment.create({ data: { courseId: coursesData[1].id, employeeId: employees[20].id, progress: 100, completedLessons: JSON.stringify(["dp1","dp2","dp3","dp4","dp5"]), status: "COMPLETED", completedAt: new Date("2026-02-18") } }),

    // React — engineering team
    prisma.enrollment.create({ data: { courseId: coursesData[2].id, employeeId: employees[5].id, progress: 75, completedLessons: JSON.stringify(["rt1","rt2","rt3","rt4","rt5","rt6"]), status: "IN_PROGRESS" } }),
    prisma.enrollment.create({ data: { courseId: coursesData[2].id, employeeId: employees[6].id, progress: 50, completedLessons: JSON.stringify(["rt1","rt2","rt3","rt4"]), status: "IN_PROGRESS" } }),
    prisma.enrollment.create({ data: { courseId: coursesData[2].id, employeeId: employees[9].id, progress: 25, completedLessons: JSON.stringify(["rt1","rt2"]), status: "IN_PROGRESS" } }),
    prisma.enrollment.create({ data: { courseId: coursesData[2].id, employeeId: employees[11].id, progress: 100, completedLessons: JSON.stringify(["rt1","rt2","rt3","rt4","rt5","rt6","rt7","rt8"]), status: "COMPLETED", completedAt: new Date("2026-03-20") } }),

    // Communication — broad enrollment
    prisma.enrollment.create({ data: { courseId: coursesData[3].id, employeeId: employees[13].id, progress: 100, completedLessons: JSON.stringify(["ec1","ec2","ec3","ec4"]), status: "COMPLETED", completedAt: new Date("2026-03-05") } }),
    prisma.enrollment.create({ data: { courseId: coursesData[3].id, employeeId: employees[17].id, progress: 50, completedLessons: JSON.stringify(["ec1","ec2"]), status: "IN_PROGRESS" } }),
    prisma.enrollment.create({ data: { courseId: coursesData[3].id, employeeId: employees[21].id, progress: 75, completedLessons: JSON.stringify(["ec1","ec2","ec3"]), status: "IN_PROGRESS" } }),

    // Design Thinking — design team
    prisma.enrollment.create({ data: { courseId: coursesData[4].id, employeeId: employees[3].id, progress: 100, completedLessons: JSON.stringify(["dt1","dt2","dt3","dt4","dt5"]), status: "COMPLETED", completedAt: new Date("2026-03-15") } }),
    prisma.enrollment.create({ data: { courseId: coursesData[4].id, employeeId: employees[15].id, progress: 60, completedLessons: JSON.stringify(["dt1","dt2","dt3"]), status: "IN_PROGRESS" } }),

    // Product Management — product team
    prisma.enrollment.create({ data: { courseId: coursesData[5].id, employeeId: employees[2].id, progress: 100, completedLessons: JSON.stringify(["pm1","pm2","pm3","pm4"]), status: "COMPLETED", completedAt: new Date("2026-02-28") } }),
    prisma.enrollment.create({ data: { courseId: coursesData[5].id, employeeId: employees[13].id, progress: 50, completedLessons: JSON.stringify(["pm1","pm2"]), status: "IN_PROGRESS" } }),
  ]);

  // Create Notifications for admin user
  await Promise.all([
    prisma.notification.create({ data: { companyId: company.id, employeeId: 'admin-employee-seed', type: 'TIMEOFF_APPROVED', title: 'Vacation request approved', message: 'Your vacation request for May 5-9 has been approved.', linkUrl: '/time-off', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 30) } }),
    prisma.notification.create({ data: { companyId: company.id, employeeId: 'admin-employee-seed', type: 'TIMEOFF_REQUEST', title: 'New time-off request', message: 'Michael Chen requested vacation for May 1-5.', linkUrl: '/time-off', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) } }),
    prisma.notification.create({ data: { companyId: company.id, employeeId: 'admin-employee-seed', type: 'SURVEY_PUBLISHED', title: 'New survey: Weekly Pulse Check', message: 'A new pulse survey has been published. Please share your feedback.', linkUrl: '/surveys', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5) } }),
    prisma.notification.create({ data: { companyId: company.id, employeeId: 'admin-employee-seed', type: 'TASK_ASSIGNED', title: 'New onboarding task assigned', message: 'You have been assigned "Review New Hire Checklist" for Isabella Rossi.', linkUrl: '/onboarding', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) } }),
    prisma.notification.create({ data: { companyId: company.id, employeeId: 'admin-employee-seed', type: 'HR_ANNOUNCEMENT', title: 'New HR Portal update', message: 'The employee handbook has been updated with the new remote work policy.', linkUrl: '/hr-portal', read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48) } }),
    prisma.notification.create({ data: { companyId: company.id, employeeId: 'admin-employee-seed', type: 'TIMEOFF_APPROVED', title: 'Sick leave approved', message: 'Your sick leave request for April 20 has been approved.', linkUrl: '/time-off', read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72) } }),
    prisma.notification.create({ data: { companyId: company.id, employeeId: 'admin-employee-seed', type: 'SURVEY_PUBLISHED', title: 'New survey: Employee Engagement', message: 'The Q1 2026 engagement survey is now open.', linkUrl: '/surveys', read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96) } }),
  ]);

  // Create Documents
  await Promise.all([
    prisma.document.create({ data: { employeeId: employees[0].id, companyId: company.id, name: "Employment Contract - Sarah Johnson", type: "CONTRACT", folder: "employee_contracts", filePath: "/documents/contracts/sarah_contract.pdf", fileSize: 245000, mimeType: "application/pdf", uploadedBy: employees[22].id, signatureStatus: "SIGNED", expiresAt: new Date("2025-01-15") } }),
    prisma.document.create({ data: { employeeId: employees[5].id, companyId: company.id, name: "Employee Handbook Acknowledgment", type: "POLICY", folder: "handbooks", filePath: "/documents/policies/priya_handbook.pdf", fileSize: 1245000, mimeType: "application/pdf", uploadedBy: employees[22].id, signatureStatus: "SIGNED" } }),
    prisma.document.create({ data: { companyId: company.id, name: "Company Data Protection Policy", type: "POLICY", folder: "company_policies", filePath: "/documents/policies/data_protection.pdf", fileSize: 2345000, mimeType: "application/pdf", uploadedBy: employees[22].id, signatureStatus: "SIGNED" } }),
    prisma.document.create({ data: { companyId: company.id, name: "Code of Conduct", type: "POLICY", folder: "company_policies", filePath: "/documents/policies/code_of_conduct.pdf", fileSize: 1234000, mimeType: "application/pdf", uploadedBy: employees[22].id, signatureStatus: "SIGNED" } }),
  ]);

  // Create Positions
  await Promise.all([
    prisma.position.create({ data: { companyId: company.id, title: "Senior Backend Engineer", departmentId: engDept.id, siteId: sites[0].id, status: "OPEN", budgetedSalary: 150000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "Frontend Engineer", departmentId: engDept.id, siteId: sites[1].id, status: "FILLED", employeeId: employees[8].id, budgetedSalary: 130000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "Product Manager", departmentId: prodDept.id, siteId: sites[1].id, status: "FILLED", employeeId: employees[12].id, budgetedSalary: 160000, currency: "USD" } }),
  ]);

  // Audit Logs
  const [userSarah, userHelen] = await Promise.all([
    prisma.user.findFirst({ where: { employeeId: employees[0].id } }),
    prisma.user.findFirst({ where: { employeeId: employees[22].id } }),
  ]);
  await Promise.all([
    prisma.auditLog.create({ data: { companyId: company.id, userId: userSarah!.id, action: "CREATE", resource: "EMPLOYEE", resourceId: employees[5].id, changes: JSON.stringify({ status: "ACTIVE" }), ipAddress: "192.168.1.100" } }),
    prisma.auditLog.create({ data: { companyId: company.id, userId: userHelen!.id, action: "UPDATE", resource: "EMPLOYEE", resourceId: employees[5].id, changes: JSON.stringify({ department: "Engineering" }), ipAddress: "192.168.1.101" } }),
  ]);

  // Create Positions for Workforce Planning
  await Promise.all([
    prisma.position.create({ data: { companyId: company.id, title: "Senior Frontend Engineer", departmentId: engDept.id, siteId: sites[0].id, status: "OPEN", budgetedSalary: 140000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "Backend Engineer", departmentId: engDept.id, siteId: sites[1].id, status: "OPEN", budgetedSalary: 120000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "DevOps Engineer", departmentId: engDept.id, siteId: sites[2].id, status: "IN_PROGRESS", budgetedSalary: 130000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "Product Designer", departmentId: desDept.id, siteId: sites[0].id, status: "OPEN", budgetedSalary: 110000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "Product Manager", departmentId: prodDept.id, siteId: sites[1].id, status: "IN_PROGRESS", budgetedSalary: 135000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "Account Executive", departmentId: salesDept.id, siteId: sites[0].id, status: "OPEN", budgetedSalary: 90000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "HR Business Partner", departmentId: hrDept.id, siteId: sites[1].id, status: "OPEN", budgetedSalary: 95000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "Data Analyst", departmentId: prodDept.id, siteId: sites[3].id, status: "OPEN", budgetedSalary: 100000, currency: "USD" } }),
    prisma.position.create({ data: { companyId: company.id, title: "Marketing Specialist", departmentId: markDept.id, siteId: sites[0].id, status: "FILLED", budgetedSalary: 85000, currency: "USD", employeeId: employees[18].id } }),
    prisma.position.create({ data: { companyId: company.id, title: "Finance Analyst", departmentId: finDept.id, siteId: sites[0].id, status: "FILLED", budgetedSalary: 92000, currency: "USD", employeeId: employees[25].id } }),
    prisma.position.create({ data: { companyId: company.id, title: "Engineering Manager", departmentId: engDept.id, siteId: sites[4].id, status: "CLOSED", budgetedSalary: 160000, currency: "USD" } }),
  ]);

  // Create Onboarding Templates
  const onboardingTemplates = await Promise.all([
    prisma.onboardingTemplate.create({ data: { companyId: company.id, name: "Engineering Onboarding", tasks: JSON.stringify(["Laptop setup","Git access","System design orientation","Meet the team","Code review training"]) } }),
    prisma.onboardingTemplate.create({ data: { companyId: company.id, name: "Sales Onboarding", tasks: JSON.stringify(["CRM training","Product training","Sales process overview","Client portfolio","Meet sales team"]) } }),
    prisma.onboardingTemplate.create({ data: { companyId: company.id, name: "General Company Onboarding", tasks: JSON.stringify(["Company orientation","Benefits enrollment","IT setup","Office tour","Team lunch"]) } }),
  ]);

  // Create Onboarding Tasks
  await Promise.all([
    prisma.onboardingTask.create({ data: { templateId: onboardingTemplates[0].id, employeeId: employees[9].id, title: "Laptop setup", description: "Complete laptop setup", assigneeId: employees[22].id, dueDate: new Date("2024-05-01"), status: "DONE", completedAt: new Date("2024-04-30") } }),
    prisma.onboardingTask.create({ data: { templateId: onboardingTemplates[0].id, employeeId: employees[9].id, title: "Git access setup", description: "Grant GitHub access", assigneeId: employees[7].id, dueDate: new Date("2024-05-02"), status: "DONE", completedAt: new Date("2024-05-02") } }),
    prisma.onboardingTask.create({ data: { templateId: onboardingTemplates[1].id, employeeId: employees[21].id, title: "CRM training", description: "Salesforce training", assigneeId: employees[19].id, dueDate: new Date("2024-02-15"), status: "DONE", completedAt: new Date("2024-02-14") } }),
    prisma.onboardingTask.create({ data: { templateId: onboardingTemplates[1].id, employeeId: employees[21].id, title: "Product training", description: "Comprehensive product overview", assigneeId: employees[19].id, dueDate: new Date("2024-02-20"), status: "IN_PROGRESS" } }),
  ]);

  // Activity Feed Data (Shoutouts)
  await Promise.all([
    prisma.post.create({ data: { companyId: company.id, authorId: employees[1].id, targetId: employees[5].id, type: "SHOUTOUT", content: "Amazing work on the API performance optimization! The response times are noticeably faster. 🚀" } }),
    prisma.post.create({ data: { companyId: company.id, authorId: employees[3].id, targetId: employees[14].id, type: "SHOUTOUT", content: "Shoutout to Carlos for the incredible new design system components. They look beautiful! ✨" } }),
    prisma.post.create({ data: { companyId: company.id, authorId: employees[22].id, targetId: employees[0].id, type: "SHOUTOUT", content: "Thank you Sarah for the inspiring All-Hands meeting today. Great to see the vision for Q2!" } }),
  ]);

  // Create Job History (Timeline)
  await Promise.all([
    // Sarah Johnson (emp 0)
    prisma.jobRecord.create({ data: { employeeId: employees[0].id, type: 'HIRED', effectiveDate: new Date("2022-01-15"), title: 'Joined the company', description: 'Started as Senior HR Manager' } }),
    prisma.jobRecord.create({ data: { employeeId: employees[0].id, type: 'PROMOTION', effectiveDate: new Date("2023-06-01"), title: 'Promotion', description: 'Promoted to HR Director' } }),
    prisma.jobRecord.create({ data: { employeeId: employees[0].id, type: 'NOTE', effectiveDate: new Date("2024-01-10"), title: 'Certification', description: 'Completed Advanced People Analytics Certification' } }),
    
    // Olivia Brown (emp 7)
    prisma.jobRecord.create({ data: { employeeId: employees[7].id, type: 'HIRED', effectiveDate: new Date("2023-03-10"), title: 'Joined the company', description: 'Started as Product Designer' } }),
    prisma.jobRecord.create({ data: { employeeId: employees[7].id, type: 'DEPT_CHANGE', effectiveDate: new Date("2024-02-15"), title: 'Department Change', description: 'Moved from Product to Growth Team' } }),
  ]);

  // Set some specific birthdays and anniversaries for the feed demo
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 5);

  // Anniversary today (Emma Watson)
  await prisma.employee.update({
    where: { id: employees[2].id },
    data: { startDate: new Date(today.getFullYear() - 3, today.getMonth(), today.getDate()) }
  });

  // Birthday tomorrow (Michael Chen)
  await prisma.employee.update({
    where: { id: employees[1].id },
    data: { personalInfo: JSON.stringify({ birthday: tomorrow.toISOString() }) }
  });

  // Birthday next week (Alex Rivera)
  await prisma.employee.update({
    where: { id: employees[3].id },
    data: { personalInfo: JSON.stringify({ birthday: nextWeek.toISOString() }) }
  });

  // New Joiner today (Zoey Sanders)
  await prisma.employee.update({
    where: { id: employees[27].id },
    data: { startDate: today }
  });

  // Create Pay Runs
  await Promise.all([
    prisma.payRun.create({ data: {
      companyId: company.id,
      periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-01-15"),
      totalAmount: 182_450, currency: "USD", employeeCount: 28,
      status: "COMPLETED", processedAt: new Date("2026-01-15"),
    }}),
    prisma.payRun.create({ data: {
      companyId: company.id,
      periodStart: new Date("2026-01-16"), periodEnd: new Date("2026-01-31"),
      totalAmount: 179_820, currency: "USD", employeeCount: 28,
      status: "COMPLETED", processedAt: new Date("2026-01-31"),
    }}),
    prisma.payRun.create({ data: {
      companyId: company.id,
      periodStart: new Date("2026-02-01"), periodEnd: new Date("2026-02-15"),
      totalAmount: 183_110, currency: "USD", employeeCount: 28,
      status: "COMPLETED", processedAt: new Date("2026-02-15"),
    }}),
    prisma.payRun.create({ data: {
      companyId: company.id,
      periodStart: new Date("2026-02-16"), periodEnd: new Date("2026-02-28"),
      totalAmount: 178_990, currency: "USD", employeeCount: 28,
      status: "COMPLETED", processedAt: new Date("2026-02-28"),
    }}),
    prisma.payRun.create({ data: {
      companyId: company.id,
      periodStart: new Date("2026-03-01"), periodEnd: new Date("2026-03-15"),
      totalAmount: 184_230, currency: "USD", employeeCount: 28,
      status: "COMPLETED", processedAt: new Date("2026-03-15"),
    }}),
    prisma.payRun.create({ data: {
      companyId: company.id,
      periodStart: new Date("2026-03-16"), periodEnd: new Date("2026-03-31"),
      totalAmount: 181_670, currency: "USD", employeeCount: 28,
      status: "PENDING", processedAt: null,
    }}),
  ]);

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
