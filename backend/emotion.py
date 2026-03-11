"""LLM 응답에서 감정을 추출하는 모듈

키워드 기반 감정 분석을 수행한다. 별도 모델 없이 가볍게 동작하도록 설계.
"""

import re

# 감정별 키워드 (한국어 + 영어)
EMOTION_KEYWORDS: dict[str, list[str]] = {
    "happy": [
        "기뻐", "좋아", "행복", "즐거", "웃", "하하", "ㅎㅎ", "ㅋㅋ", "감사",
        "축하", "멋져", "대단", "잘했", "최고", "사랑", "설레", "신나",
        "glad", "happy", "great", "awesome", "wonderful", "love", "thank",
        "😊", "😄", "😃", "🥰", "❤️", "👍", "🎉",
    ],
    "sad": [
        "슬퍼", "아쉬", "우울", "힘들", "괴로", "눈물", "안타까",
        "불행", "서운", "외로", "그리", "ㅠㅠ", "ㅜㅜ",
        "sad", "sorry", "unfortunately", "miss",
        "😢", "😭", "💔",
    ],
    "angry": [
        "화나", "짜증", "분노", "열받", "빡", "싫어", "나쁜",
        "못된", "어이없", "황당",
        "angry", "furious", "annoyed", "hate",
        "😡", "😤", "💢",
    ],
    "surprised": [
        "놀라", "깜짝", "헐", "세상에", "대박", "와!", "어머",
        "맙소사", "충격", "놀랍",
        "wow", "surprise", "amazing", "incredible",
        "😲", "😮", "🤯",
    ],
    "thinking": [
        "생각해", "고민", "글쎄", "음...", "아마", "어떨까", "고려",
        "분석", "검토", "확인",
        "think", "consider", "perhaps", "maybe", "hmm",
        "🤔", "💭",
    ],
}


def detect_emotion(text: str) -> str:
    """텍스트에서 감정을 추출한다.

    Returns:
        감정 문자열: "happy", "sad", "angry", "surprised", "thinking", "neutral"
    """
    if not text:
        return "neutral"

    text_lower = text.lower()

    scores: dict[str, int] = {}
    for emotion, keywords in EMOTION_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            count = text_lower.count(keyword.lower())
            score += count
        if score > 0:
            scores[emotion] = score

    if not scores:
        return "neutral"

    return max(scores, key=scores.get)
