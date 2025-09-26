// 数据库初始化脚本
const { pool, testConnection } = require('./db');

// 创建分析结果表的SQL语句
const createTableSQL = `
CREATE TABLE IF NOT EXISTS analysis_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_text TEXT NOT NULL,
  sentiment_score DECIMAL(5,4) NOT NULL,
  keywords VARCHAR(255) NOT NULL,
  frequency_data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function initializeDatabase() {
  try {
    console.log('🔧 正在初始化数据库...');
    
    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ 数据库连接失败，无法初始化表结构');
      return false;
    }
    
    // 创建表
    console.log('📋 正在创建 analyses 表...');
    await pool.execute(createTableSQL);
    console.log('✅ analyses 表创建成功');
    
    // 检查表结构
    console.log('🔍 检查表结构...');
    const [tables] = await pool.execute("SHOW TABLES LIKE 'analysis_history'");
    
    if (tables.length > 0) {
      console.log('✅ analysis_history 表存在');
      
      // 显示表结构
      const [columns] = await pool.execute("DESCRIBE analysis_history");
      console.log('📊 表结构:');
      columns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''}`);
      });
      
      return true;
    } else {
      console.error('❌ analyses 表创建失败');
      return false;
    }
    
  } catch (error) {
    console.error('💥 数据库初始化失败:', error.message);
    return false;
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initializeDatabase()
    .then(success => {
      if (success) {
        console.log('🎉 数据库初始化完成');
        process.exit(0);
      } else {
        console.error('❌ 数据库初始化失败');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 初始化过程中发生错误:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
