// db.js
const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'text_analysis',
  connectionLimit: 10, // 连接池大小
  acquireTimeout: 60000, // 获取连接超时时间（毫秒）
  timeout: 60000, // 查询超时时间（毫秒）
  reconnect: true // 启用自动重连
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 数据库连接测试函数
async function testConnection() {
  let connection;
  try {
    // 从连接池获取连接
    connection = await pool.getConnection();
    
    // 执行简单的查询来测试连接
    const [rows] = await connection.execute('SELECT 1 as test');
    
    console.log('✅ 数据库连接成功');
    console.log(`📊 连接测试结果: ${rows[0].test}`);
    
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.error('💡 请检查以下配置:');
    console.error(`   - 主机: ${dbConfig.host}`);
    console.error(`   - 数据库: ${dbConfig.database}`);
    console.error(`   - 用户名: ${dbConfig.user}`);
    console.error('   - 密码: ********');
    console.error('   - 确保MySQL服务正在运行');
    
    return false;
  } finally {
    // 释放连接回连接池
    if (connection) {
      connection.release();
    }
  }
}

// 连接池事件监听
pool.on('acquire', (connection) => {
  console.log('🔗 连接获取成功，连接ID:', connection.threadId);
});

pool.on('release', (connection) => {
  console.log('🔄 连接释放，连接ID:', connection.threadId);
});

pool.on('enqueue', () => {
  console.log('⏳ 等待可用连接...');
});

pool.on('error', (err) => {
  console.error('💥 连接池错误:', err.message);
});

// 导出连接池和测试函数
module.exports = {
  pool,
  testConnection,
  dbConfig
};
