const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
// 使用 cors 中间件允许前端跨域请求
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

const PORT = 3000;
const PYTHON_SERVICE_URL = "http://localhost:5000"; // Python 服务的地址

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
    res.json(pythonResponse.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to analyze text" });
  }
});

// 【新增】相关性分析的代理接口
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

app.listen(PORT, () => {
  console.log(`Node.js backend server running on http://localhost:${PORT}`);
});
