from flask import Flask
from flask_cors import CORS

import jieba
from collections import Counter
from flask import request, jsonify


import jieba.analyse
from gensim.models import Word2Vec
# 初始化 Flask 应用
app = Flask(__name__)
# 使用 Flask-Cors 允许所有来源的跨域请求
CORS(app)

# 定义一个 GET 路由 /ping
@app.route('/ping', methods=['GET'])
def ping():
    """这是一个心跳检测接口，用于确认服务是否存活"""
    return {"status": "ok", "service": "python-nlp"}



import jieba
from collections import Counter
from flask import request, jsonify
from snownlp import SnowNLP

@app.route('/analyze/basic', methods=['POST'])
def analyze_basic():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "Missing 'text' in request body"}), 400

    text = data['text']

    # 1. 分词
    words = list(jieba.cut(text))

    # 2. 词频统计
    # 过滤掉一些单字和标点符号可以提高质量
    stopwords = {' ', '，', '。', '！', '？'} 
    meaningful_words = [word for word in words if word not in stopwords]
    frequency = Counter(meaningful_words)

    # 按频率降序排序
    sorted_frequency = dict(sorted(frequency.items(), key=lambda item: item[1], reverse=True))

    
    # 情感分析
    s = SnowNLP(text)
    sentiment_score = s.sentiments
    
    return jsonify({
        "words": meaningful_words,
        "frequency": sorted_frequency,
        "sentiment": sentiment_score
    })

# 启动服务
if __name__ == '__main__':
    # 监听在 0.0.0.0 表示接受任何来源的连接，端口为 5000
    app.run(host='0.0.0.0', port=5000)