const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
// 使用 cors 中间件允许前端跨域请求
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

const PORT = 3000;
const PYTHON_SERVICE_URL = "http://localhost:5000"; // Python 服务的地址

const { pool, testConnection } = require("./db"); // 引入数据库连接池和测试函数
const { initializeDatabase } = require("./init-db"); // 引入数据库初始化函数

// 定义健康检查接口 /api/health
app.get("/api/health", async (req, res) => {
  console.log("Received health check request from frontend.");
  try {
    // 尝试请求 Python 服务的 /ping 接口
    console.log(`Forwarding ping request to: ${PYTHON_SERVICE_URL}/ping`);
    const pythonServiceResponse = await axios.get(`${PYTHON_SERVICE_URL}/ping`);

    // 如果 Python 服务返回成功
    if (pythonServiceResponse.data.status === "ok") {
      console.log("Python service responded successfully.");
      res.json({
        status: "ok",
        services: {
          node: "running",
          python: "running",
        },
      });
    } else {
      throw new Error("Python service reported an issue.");
    }
  } catch (error) {
    console.error("Error contacting Python service:", error.message);
    res.status(500).json({
      status: "error",
      services: {
        node: "running",
        python: "unreachable", // Python 服务无法访问
      },
    });
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const pythonResponse = await axios.post(
      `${PYTHON_SERVICE_URL}/analyze/basic`,
      { text }
    );

    const result = pythonResponse.data;

    // 将结果存入数据库
    try {
      const sql =
        "INSERT INTO analysis_history (original_text, sentiment_score, keywords, frequency_data, created_at) VALUES (?, ?, ?, ?, NOW())";
      const values = [
        req.body.text,
        result.sentiment,
        result.keywords.join(","),
        JSON.stringify(result.frequency),
      ];

      console.log("💾 正在保存分析结果到数据库...");
      await pool.execute(sql, values);
      console.log("✅ 分析结果已成功保存到数据库");
    } catch (dbError) {
      console.warn(
        "⚠️ 数据库保存失败，但分析结果仍返回给前端:",
        dbError.message
      );
      // 数据库错误不影响返回分析结果给前端
    }

    res.json(pythonResponse.data);
  } catch (error) {
    console.error("❌ 文本分析失败:", error.message);
    res.status(500).json({ error: "Failed to analyze text" });
  }
});

// 相关性分析的代理接口
app.post("/api/correlation", async (req, res) => {
  try {
    const { words, target_word } = req.body;
    if (!words || !target_word) {
      return res
        .status(400)
        .json({ error: "Words list and target_word are required" });
    }

    // 将请求直接转发给 Python 的新接口
    const pythonResponse = await axios.post(
      `${PYTHON_SERVICE_URL}/analyze/correlation`,
      {
        words,
        target_word,
      }
    );

    res.json(pythonResponse.data);
  } catch (error) {
    // 转发 Python 服务可能返回的错误信息
    const statusCode = error.response ? error.response.status : 500;
    const errorMessage = error.response
      ? error.response.data
      : "Failed to get correlation data";
    res.status(statusCode).json(errorMessage);
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM analysis_history");
    console.log("Fetched analysis history:", rows.length, "records");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching analysis history:", error.message);
    res.status(500).json({ error: "Failed to fetch analysis history" });
  }
});

app.post("/api/ner", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    const pythonResponse = await axios.post(
      `${PYTHON_SERVICE_URL}/analyze/ner`,
      { text }
    );
    const result = pythonResponse.data;
    res.json(result);
  } catch (error) {
    console.error("❌ 命名实体识别失败:", error.message);
    res.status(500).json({ error: "Failed to perform NER" });
  }
});

app.post("/api/co-word-network", async (req, res) => {
  try {
    const { words } = req.body;
    if(!words){
      return res.status(400).json({error: "Words is required"});
    }
    const pythonResponse = await axios.post(
      `${PYTHON_SERVICE_URL}/analyze/co-word-network`,
      { words }
    );
    res.json(pythonResponse.data);
  } catch (error) {
    console.error("❌ 共词网络分析失败:", error.message);
    res
      .status(500)
      .json({ error: "Failed to perform co-word network analysis" });
  }
});

// 应用启动函数
async function startServer() {
  try {
    console.log("🔍 正在测试数据库连接...");

    // 测试数据库连接
    const dbConnected = await testConnection();
    let dbInitialized = false;

    if (dbConnected) {
      console.log("🔄 正在初始化数据库表结构...");
      dbInitialized = await initializeDatabase();
      if (dbInitialized) {
        console.log("✅ 数据库表结构初始化成功");
      } else {
        console.warn("⚠️ 数据库表结构初始化失败，但服务器将继续启动");
      }
    } else {
      console.warn(
        "⚠️ 数据库连接失败，但服务器将继续启动（某些功能可能不可用）"
      );
    }

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`✅ Node.js 后端服务运行在 http://localhost:${PORT}`);
      console.log("📊 服务状态:");
      console.log(`   - Node.js 服务: ✅ 运行中`);
      console.log(`   - 数据库连接: ${dbConnected ? "✅ 正常" : "❌ 异常"}`);
      console.log(
        `   - 数据库表结构: ${
          dbConnected
            ? dbInitialized
              ? "✅ 已初始化"
              : "❌ 初始化失败"
            : "❌ 未连接"
        }`
      );
      console.log(`   - Python NLP 服务: 🔄 待检测`);
    });
  } catch (error) {
    console.error("💥 服务器启动失败:", error.message);
    process.exit(1);
  }
}

// 启动服务器
startServer();
