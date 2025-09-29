from flask import Flask
from flask_cors import CORS

import jieba
from flask import request, jsonify
from collections import Counter
from snownlp import SnowNLP

import jieba.analyse
from gensim.models import Word2Vec


# 初始化 Flask 应用
app = Flask(__name__)
# 使用 Flask-Cors 允许所有来源的跨域请求
CORS(app)


# 定义一个 GET 路由 /ping
@app.route("/ping", methods=["GET"])
def ping():
    """这是一个心跳检测接口，用于确认服务是否存活"""
    return {"status": "ok", "service": "python-nlp"}


@app.route("/analyze/basic", methods=["POST"])
def analyze_basic():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' in request body"}), 400

    text = data["text"]

    # 1. 分词
    words = list(jieba.cut(text))

    # 2. 词频统计
    # 过滤掉一些单字和标点符号可以提高质量
    stopwords = {
        " ",
        "，",
        "。",
        "！",
        "？",
        "的",
        "是",
        "了",
        "在",
        "也",
        "和",
        "就",
        "都",
        "不",
    }
    meaningful_words = [
        word for word in words if word not in stopwords and len(word) > 1
    ]

    frequency = Counter(meaningful_words)
    sorted_frequency = dict(
        sorted(frequency.items(), key=lambda item: item[1], reverse=True)
    )

    # 3. 情感分析
    s = SnowNLP(text)
    sentiment_score = s.sentiments

    # 4. 【新增】关键词提取
    #    使用 TF-IDF 算法，提取 top 10 的关键词
    keywords = jieba.analyse.extract_tags(text, topK=10, withWeight=False)

    return jsonify(
        {
            "words": meaningful_words,
            "frequency": sorted_frequency,
            "sentiment": sentiment_score,
            "keywords": keywords,  # 在返回结果中加入关键词
        }
    )


# 接口 2: 词语相关性分析
@app.route("/analyze/correlation", methods=["POST"])
def analyze_correlation():
    data = request.get_json()
    if not data or "words" not in data or "target_word" not in data:
        return (
            jsonify(
                {"error": "Request body must contain 'words' list and 'target_word'"}
            ),
            400,
        )

    # 从请求中获取分词列表和目标词
    # gensim 需要的是一个句子列表，所以我们将整个分词列表作为一个句子
    sentences = [data["words"]]
    target_word = data["target_word"]

    # 检查目标词是否在文本中，避免无效计算
    if target_word not in sentences[0]:
        return (
            jsonify(
                {
                    "error": f"Target word '{target_word}' not found in the provided text."
                }
            ),
            400,
        )

    try:
        # 动态训练一个 Word2Vec 模型
        # vector_size: 词向量维度; window: 上下文窗口大小; min_count: 忽略频率低于此值的词
        model = Word2Vec(
            sentences=sentences, vector_size=100, window=5, min_count=1, workers=4
        )

        # 找出与目标词最相似的 top 5 词语
        # model.wv.most_similar 返回的是一个列表，每个元素是 (词, 相似度)
        similar_words = model.wv.most_similar(target_word, topn=5)

        return jsonify({"source_word": target_word, "similar_words": similar_words})
    except KeyError:
        # 如果目标词因为太少见等原因没有被模型学习到，会抛出 KeyError
        return (
            jsonify(
                {
                    "error": f"Word '{target_word}' is in text but not in the model's vocabulary. Try a more frequent word."
                }
            ),
            500,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 接口 3: spaCy 实体识别
import spacy
# 在全局加载模型以提高效率
nlp_ner = spacy.load("zh_core_web_sm")

@app.route("/analyze/ner", methods=["POST"])
def analyze_ner():
    data = request.get_json()
    text = data.get("text", "")
    doc = nlp_ner(text)
    entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
    return jsonify({"entities": entities})


# 启动服务
if __name__ == "__main__":
    # 监听在 0.0.0.0 表示接受任何来源的连接，端口为 5000
    app.run(host="0.0.0.0", port=5000)
