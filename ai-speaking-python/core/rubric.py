"""IELTS Speaking rubric loader."""

from dataclasses import dataclass, field


@dataclass
class RubricBand:
    band: float
    descriptor: str = ""


@dataclass
class SpeakingRubric:
    fluency_coherence: list[RubricBand] = field(default_factory=list)
    lexical_resource: list[RubricBand] = field(default_factory=list)
    grammatical_range: list[RubricBand] = field(default_factory=list)
    pronunciation: list[RubricBand] = field(default_factory=list)


def load_rubric() -> SpeakingRubric:
    fc = [RubricBand(5, "Usually maintains flow but uses repetition/self-correction."),
          RubricBand(6, "Willing to speak at length; may lose coherence."),
          RubricBand(7, "Speaks at length without noticeable effort."),
          RubricBand(8, "Speaks fluently; occasional repetition."),
          RubricBand(9, "Speaks fluently with rare repetition.")]
    lr = [RubricBand(5, "Limited flexibility; paraphrasing with mixed success."),
          RubricBand(6, "Wide enough vocabulary; generally paraphrases successfully."),
          RubricBand(7, "Flexible vocabulary for variety of topics; less common vocabulary."),
          RubricBand(8, "Wide vocabulary readily and flexibly; skilful idiomatic usage."),
          RubricBand(9, "Full flexibility; natural idiomatic language.")]
    gra = [RubricBand(5, "Basic sentences with reasonable accuracy; limited complex structures."),
           RubricBand(6, "Mix of simple and complex; limited flexibility."),
           RubricBand(7, "Range of complex structures; some flexibility."),
           RubricBand(8, "Wide range flexibly; majority error-free."),
           RubricBand(9, "Full range naturally; consistently accurate.")]
    pron = [RubricBand(5, "Features of band 4 and some of band 6."),
            RubricBand(6, "Range of pronunciation features with mixed control."),
            RubricBand(7, "Features of band 6 and some of band 8."),
            RubricBand(8, "Wide range of pronunciation features; easy to understand."),
            RubricBand(9, "Full range with precision; effortless to understand.")]
    return SpeakingRubric(fc, lr, gra, pron)
