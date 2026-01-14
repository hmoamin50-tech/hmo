import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const dataPath = path.join(process.cwd(), "data/responses.json");
    
    if (!fs.existsSync(dataPath)) {
      return res.status(200).json({ 
        message: "لا توجد بيانات بعد",
        count: 0,
        responses: []
      });
    }

    const fileContent = fs.readFileSync(dataPath, "utf8");
    const responses = fileContent ? JSON.parse(fileContent) : [];
    
    // ترتيب حسب الأحدث
    const sortedResponses = responses.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.status(200).json({
      count: sortedResponses.length,
      lastUpdated: new Date().toISOString(),
      responses: sortedResponses
    });
  } catch (error) {
    console.error("Error reading responses:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
