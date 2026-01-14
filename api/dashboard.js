import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const dataPath = path.join(process.cwd(), "data/responses.json");
    
    console.log('🔍 محاولة قراءة البيانات من:', dataPath);
    
    if (!fs.existsSync(dataPath)) {
      console.log('❌ الملف غير موجود:', dataPath);
      return res.status(200).json({ 
        message: "لا توجد بيانات بعد",
        count: 0,
        responses: [],
        fileExists: false,
        path: dataPath
      });
    }

    const fileContent = fs.readFileSync(dataPath, "utf8");
    console.log('📄 حجم الملف:', fileContent.length, 'حرف');
    
    if (!fileContent.trim()) {
      console.log('⚠️ الملف فارغ');
      return res.status(200).json({ 
        message: "الملف موجود لكنه فارغ",
        count: 0,
        responses: [],
        fileExists: true,
        fileSize: 0
      });
    }

    const responses = JSON.parse(fileContent);
    console.log('✅ تم تحميل', responses.length, 'سجل');
    
    // ترتيب حسب الأحدث
    const sortedResponses = responses.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    // إحصائيات
    const today = new Date().toDateString();
    const todayCount = responses.filter(r => 
      new Date(r.timestamp).toDateString() === today
    ).length;
    
    const avgScore = responses.length > 0 
      ? Math.round(responses.reduce((sum, r) => sum + (r.compatibility?.score || 0), 0) / responses.length)
      : 0;

    res.status(200).json({
      count: sortedResponses.length,
      todayCount: todayCount,
      avgScore: avgScore,
      lastUpdated: new Date().toISOString(),
      fileInfo: {
        path: dataPath,
        size: fileContent.length,
        exists: true
      },
      responses: sortedResponses
    });
  } catch (error) {
    console.error("❌ خطأ في قراءة البيانات:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      stack: error.stack 
    });
  }
}
