from core.analyzer import analyze_essay


class TestEssayAnalyzer:
    def test_empty_essay(self):
        result = analyze_essay("")
        assert result.word_count == 0
        assert result.sentence_count == 0
        assert result.paragraph_count == 0

    def test_basic_essay(self):
        essay = "This is a test essay. It has multiple sentences. This is the third sentence."
        result = analyze_essay(essay)
        assert result.word_count == 14
        assert result.sentence_count == 3

    def test_paragraph_detection(self):
        essay = "This is the first paragraph. It has some content.\n\nThis is the second paragraph. It also has content."
        result = analyze_essay(essay)
        assert result.paragraph_count >= 2

    def test_lexical_diversity(self):
        essay = "The cat sat on the mat. The dog ran in the park."
        result = analyze_essay(essay)
        assert result.lexical_diversity > 0
        assert result.lexical_diversity <= 1.0

    def test_cohesion_markers(self):
        essay = "First we need to consider the issue. However there are some problems. Finally we can conclude."
        result = analyze_essay(essay)
        assert result.cohesion_marker_density > 0
        assert len(result.cohesion_markers_found) > 0

    def test_academic_vocabulary(self):
        essay = "This significant phenomenon demonstrates a crucial implication for sustainability."
        result = analyze_essay(essay)
        assert result.academic_vocabulary_ratio > 0

    def test_structure_detection(self):
        essay = "This is an introduction to the topic. It explains the main idea.\n\n"
        essay += "This is the body paragraph with supporting arguments.\n\n"
        essay += "In conclusion, this essay has summarized all the main points."
        result = analyze_essay(essay)
        assert result.has_introduction
        assert result.has_conclusion
        assert result.has_clear_structure
