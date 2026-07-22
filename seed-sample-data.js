const mongoose = require("mongoose");
const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const uri = "mongodb+srv://allurite:Youssef2005@cluster0.hb6akdj.mongodb.net/allurite?retryWrites=true&w=majority&appName=Cluster0";

async function seedData() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for seeding...");

    const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
    const Employee = mongoose.model("Employee", new mongoose.Schema({}, { strict: false }), "employees");
    const Client = mongoose.model("Client", new mongoose.Schema({}, { strict: false }), "clients");
    const Task = mongoose.model("Task", new mongoose.Schema({}, { strict: false }), "tasks");
    const FollowUp = mongoose.model("FollowUp", new mongoose.Schema({}, { strict: false }), "followups");

    // Find SuperAdmin or active user
    const adminUser = await User.findOne({ role: "SuperAdmin" });
    if (!adminUser) {
      console.error("No SuperAdmin found. Run seed-admin.js first.");
      process.exit(1);
    }

    let agent = await Employee.findOne({});
    if (!agent) {
      agent = await Employee.create({
        user: adminUser._id,
        firstName: "يوسف",
        lastName: "حمادة",
        jobTitle: "مدير مبيعات",
        department: "المبيعات",
        status: "Active",
      });
      console.log("Created default Employee profile.");
    }

    // Seed 5 Sample Clients
    const clientData = [
      {
        firstName: "أحمد",
        lastName: "السيد",
        email: "ahmed.elsayed@alamal.com",
        phone: "+201012345678",
        companyName: "شركة الأمل للتكنولوجيا",
        website: "https://alamal-tech.com",
        industry: "تكنولوجيا المعلومات",
        status: "ActiveCustomer",
        source: "Website",
        assignedAgent: agent._id,
        createdBy: adminUser._id,
      },
      {
        firstName: "محمد",
        lastName: "فاروق",
        email: "m.farouk@elnoor.com",
        phone: "+201198765432",
        companyName: "مؤسسة النور للاستيراد والتصدير",
        website: "https://elnoor-trade.com",
        industry: "الاستيراد والتصدير",
        status: "Qualified",
        source: "Referral",
        assignedAgent: agent._id,
        createdBy: adminUser._id,
      },
      {
        firstName: "سارة",
        lastName: "محمود",
        email: "sara.m@elbadr.com",
        phone: "+201234567890",
        companyName: "مجموعة البدر التجارية",
        industry: "التجارة العامة",
        status: "Lead",
        source: "LinkedIn",
        assignedAgent: agent._id,
        createdBy: adminUser._id,
      },
      {
        firstName: "عمر",
        lastName: "خالد",
        email: "omar.k@alofok.io",
        phone: "+201055544332",
        companyName: "شركة الأفق البرمجية",
        industry: "البرمجيات",
        status: "ActiveCustomer",
        source: "ColdOutreach",
        assignedAgent: agent._id,
        createdBy: adminUser._id,
      },
      {
        firstName: "منار",
        lastName: "حسن",
        email: "manar@alsalam-print.com",
        phone: "+201144332211",
        companyName: "مطبعة السلام العالمية",
        industry: "الطباعة والتغليف",
        status: "Qualified",
        source: "Advertisement",
        assignedAgent: agent._id,
        createdBy: adminUser._id,
      },
    ];

    await Client.deleteMany({});
    const insertedClients = await Client.insertMany(clientData);
    console.log(`Successfully seeded ${insertedClients.length} clients.`);

    // Seed 6 Sample Tasks
    const now = new Date();
    const taskData = [
      {
        title: "مراجعة وتسليم عقد شركة الأمل للتكنولوجيا",
        description: "مراجعة البنود القانونية وتوقيع الشراكة السنوية",
        status: "In Progress",
        priority: "High",
        dueDate: new Date(now.getTime() + 86400000 * 2), // 2 days from now
        client: insertedClients[0]._id,
        assignedTo: agent._id,
        createdBy: adminUser._id,
      },
      {
        title: "إرسال العرض الفني والمالي لشركة النور",
        description: "إعداد ملف الأسعار والتخفيضات الموسمية",
        status: "Pending",
        priority: "High",
        dueDate: new Date(now.getTime() + 86400000 * 1), // tomorrow
        client: insertedClients[1]._id,
        assignedTo: agent._id,
        createdBy: adminUser._id,
      },
      {
        title: "متابعة الدفعة الثانية من حساب شركة الأفق",
        description: "التواصل مع المحاسب لتأكيد التحويل البنكي",
        status: "Completed",
        priority: "Medium",
        dueDate: new Date(now.getTime() - 86400000 * 1), // yesterday
        client: insertedClients[3]._id,
        assignedTo: agent._id,
        createdBy: adminUser._id,
      },
      {
        title: "تحديث ملف المتطلبات لمجموعة البدر",
        description: "تسجيل الملاحظات الواردة في الاجتماع الأخير",
        status: "Pending",
        priority: "Low",
        dueDate: new Date(now.getTime() + 86400000 * 4),
        client: insertedClients[2]._id,
        assignedTo: agent._id,
        createdBy: adminUser._id,
      },
    ];

    await Task.deleteMany({});
    const insertedTasks = await Task.insertMany(taskData);
    console.log(`Successfully seeded ${insertedTasks.length} tasks.`);

    // Seed 6 Sample FollowUps (Today, Upcoming, Completed, Missed)
    const todayMorning = new Date();
    todayMorning.setHours(11, 30, 0, 0);

    const todayAfternoon = new Date();
    todayAfternoon.setHours(15, 0, 0, 0);

    const tomorrowNoon = new Date(now.getTime() + 86400000);
    tomorrowNoon.setHours(12, 0, 0, 0);

    const yesterdayNoon = new Date(now.getTime() - 86400000);
    yesterdayNoon.setHours(14, 0, 0, 0);

    const followupData = [
      {
        client: insertedClients[0]._id,
        assignedAgent: agent._id,
        title: "مكالمة متابعة تفاصيل العقد مع المهندس أحمد",
        description: "مناقشة الدفعات وتوقيع العقد النهائي",
        type: "Call",
        scheduledAt: todayMorning,
        status: "Scheduled",
        notes: "تم تجهيز مسودة العقد الأولية",
        createdBy: adminUser._id,
      },
      {
        client: insertedClients[1]._id,
        assignedAgent: agent._id,
        title: "اجتماع عرض التوضيح التجاري Demo لشركة النور",
        description: "عرض الميزات الذكية للـ CRM وتجربة المستخدم",
        type: "Meeting",
        scheduledAt: todayAfternoon,
        status: "Scheduled",
        notes: "تجهيز شريحة التقديم والقاعة النموذجية",
        createdBy: adminUser._id,
      },
      {
        client: insertedClients[2]._id,
        assignedAgent: agent._id,
        title: "إرسال قائمة الأسعار عبر البريد الإلكتروني",
        description: "إرسال كتالوج المنتجات والخدمات الرئيسية",
        type: "Email",
        scheduledAt: tomorrowNoon,
        status: "Scheduled",
        createdBy: adminUser._id,
      },
      {
        client: insertedClients[3]._id,
        assignedAgent: agent._id,
        title: "جلسة مراجعة الأداء الشهري مع شركة الأفق",
        description: "تقييم مؤشرات الأداء لفرق المبيعات والخدمة",
        type: "Meeting",
        scheduledAt: yesterdayNoon,
        status: "Completed",
        notes: "تم الاتفاق على توسيع الترخيص إلى 20 مستخدم",
        createdBy: adminUser._id,
      },
      {
        client: insertedClients[4]._id,
        assignedAgent: agent._id,
        title: "مكالمة استكشاف احتياجات مطبعة السلام",
        description: "تحديد حجم المطابع ومتطلبات النظام الحالي",
        type: "Call",
        scheduledAt: yesterdayNoon,
        status: "Missed",
        notes: "لم يتم الرد، سيتم إعادة المحاولة اليوم",
        createdBy: adminUser._id,
      },
    ];

    await FollowUp.deleteMany({});
    const insertedFollowUps = await FollowUp.insertMany(followupData);
    console.log(`Successfully seeded ${insertedFollowUps.length} follow-ups.`);

    console.log("\nALL DEMO DATA SEEDED SUCCESSFULLY!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

seedData();
