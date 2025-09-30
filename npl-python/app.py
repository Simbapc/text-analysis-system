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
    if not text:
        return jsonify({"error": "Request body must contain 'text'"}), 400
    doc = nlp_ner(text)
    entities = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
    return jsonify({"entities": entities})

# 接口 4: 词语共现网络
import networkx as nx
from itertools import combinations

@app.route("/analyze/co-word-network", methods=["POST"])
def analyze_co_word_network():
    data = request.get_json()
    words = data.get("words", [])
    if not words:
        return jsonify({"error": "Request body must contain 'words' list"}), 400
    # 1. 选择 top N 高频词作为网络节点 (简化网络)
    top_words = [item[0] for item in Counter(words).most_common(20)]

    # 2. 构建共现关系：使用滑动窗口
    co_occurrence = {}
    window_size = 5
    for i in range(len(words) - window_size + 1):
        window = words[i : i + window_size]
        # 找出窗口内属于 top_words 的词
        present_top_words = set(w for w in window if w in top_words)
        for w1, w2 in combinations(present_top_words, 2):
            key = tuple(sorted((w1, w2)))
            co_occurrence[key] = co_occurrence.get(key, 0) + 1

    # 3. 使用 networkx 构建图，并转换为前端可用的格式
    G = nx.Graph()
    for (w1, w2), weight in co_occurrence.items():
        if weight > 1:  # 过滤掉弱连接
            G.add_edge(w1, w2, weight=weight)

    # 4. 格式化为 ECharts 需要的 nodes 和 links 格式
    nodes = [
        {"id": word, "name": word, "symbolSize": G.degree(word) * 3 + 10}
        for word in G.nodes()
    ]
    links = [
        {"source": u, "target": v, "value": d["weight"]}
        for u, v, d in G.edges(data=True)
    ]

    return jsonify({"nodes": nodes, "links": links})


# 接口 5: 主题模型 (LDA)分析
from gensim import corpora, models

@app.route("/analyze/topics", methods=["POST"])
def analyze_topics():
    data = request.get_json()
    text = data.get("text", "")
    num_topics = data.get("num_topics", 3)

    if not text:
        return jsonify({"error": "Text is required"}), 400

    # 将文本按段落或句子拆分，模拟多文档
    # 这里用换行符和句号作为简单的拆分依据
    paragraphs = [p for p in text.replace("。", "\n").split("\n") if p]
    docs_words = [list(jieba.cut(p)) for p in paragraphs]

    if not docs_words:
        return jsonify({"topics": []})

    # 1. 创建词典和语料库
    dictionary = corpora.Dictionary(docs_words)
    corpus = [dictionary.doc2bow(doc) for doc in docs_words]

    # 2. 训练 LDA 模型
    lda_model = models.LdaModel(
        corpus, num_topics=num_topics, id2word=dictionary, passes=15
    )

    # 3. 【核心优化】使用 show_topics(formatted=False) 获取原始数据
    #    它返回的是 (词语, 权重) 的元组列表，而不是格式化后的字符串
    raw_topics = lda_model.show_topics(
        num_topics=num_topics, num_words=5, formatted=False
    )

    # 4. 【新增】将原始数据构造成对前端友好的 JSON 格式
    formatted_topics = []
    for topic_id, words_tuples in raw_topics:
        topic_dict = {
            "topicId": topic_id,
            "words": [
                {"term": term, "weight": float(weight)} for term, weight in words_tuples
            ],
        }
        formatted_topics.append(topic_dict)

    return jsonify({"topics": formatted_topics})


# 启动服务
if __name__ == "__main__":
    # 监听在 0.0.0.0 表示接受任何来源的连接，端口为 5000
    app.run(host="0.0.0.0", port=5000)
