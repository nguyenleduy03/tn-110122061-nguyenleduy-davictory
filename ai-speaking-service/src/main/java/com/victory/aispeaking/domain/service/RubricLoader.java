package com.victory.aispeaking.domain.service;

import com.victory.aispeaking.domain.model.RubricBand;
import com.victory.aispeaking.domain.model.SpeakingRubric;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class RubricLoader {

    public SpeakingRubric loadIELTSRubric() {
        return SpeakingRubric.builder()
                .criteriaBands(Map.of(
                    "FC", buildFluencyBands(),
                    "LR", buildLexicalBands(),
                    "GRA", buildGrammarBands(),
                    "P", buildPronunciationBands()
                ))
                .rubricSummary(Map.of(
                    "FC", "Fluency and Coherence: speech flow, logical organisation, cohesive devices",
                    "LR", "Lexical Resource: vocabulary range, precision, idiomatic language",
                    "GRA", "Grammatical Range and Accuracy: sentence variety, error frequency",
                    "P", "Pronunciation: clarity, intonation, stress, individual sounds"
                ))
                .build();
    }

    private List<RubricBand> buildFluencyBands() {
        return List.of(
            RubricBand.builder().band(9).descriptor("Speaks fluently with only rare repetition or self-correction; any hesitation is content-related. Uses cohesive features appropriately.").summary("Fluent with natural, content-driven hesitation; skilled use of cohesion.").build(),
            RubricBand.builder().band(8).descriptor("Speaks fluently with occasional repetition or self-correction; hesitation is usually content-related. Uses a range of cohesive features flexibly.").summary("Generally fluent; effective use of a range of cohesive features.").build(),
            RubricBand.builder().band(7).descriptor("Speaks at length without noticeable effort; uses a range of connectives and discourse markers with some flexibility.").summary("Speaks at length; good range of connectives with some flexibility.").build(),
            RubricBand.builder().band(6).descriptor("Willing to speak at length, though may lose coherence at times. Uses a range of connectives but not always appropriately.").summary("Willing to speak; uses connectives but may lack coherence at times.").build(),
            RubricBand.builder().band(5).descriptor("Usually maintains flow but uses repetition/self-correction. Uses basic connectives repetitively. Some hesitation.").summary("Maintains flow with hesitation; basic connectives used repetitively.").build(),
            RubricBand.builder().band(4).descriptor("Responds with noticeable pauses; frequent hesitation and repetition. Limited use of connectives; speech often disjointed.").summary("Frequent pauses and repetition; limited, disjointed use of connectives.").build(),
            RubricBand.builder().band(3).descriptor("Long pauses; unable to maintain flow. Simple sentences with little or no linking.").summary("Long pauses, no sustained flow; very limited linking.").build(),
            RubricBand.builder().band(2).descriptor("Short, isolated phrases with long pauses; no连贯性.").summary("Isolated words/phrases; no connected speech.").build(),
            RubricBand.builder().band(1).descriptor("No communication possible; no rateable language.").summary("No rateable language.").build()
        );
    }

    private List<RubricBand> buildLexicalBands() {
        return List.of(
            RubricBand.builder().band(9).descriptor("Uses vocabulary with full flexibility and precision; uses idiomatic language naturally and accurately.").summary("Full flexibility and precision; natural idiomatic language.").build(),
            RubricBand.builder().band(8).descriptor("Uses a wide vocabulary resource readily and flexibly; uses idiomatic language skillfully with occasional inaccuracies.").summary("Wide, flexible vocabulary; skillful idiomatic language.").build(),
            RubricBand.builder().band(7).descriptor("Uses vocabulary resource flexibly to discuss a variety of topics; uses some less common and idiomatic vocabulary.").summary("Flexible vocabulary use; some less common and idiomatic items.").build(),
            RubricBand.builder().band(6).descriptor("Has enough vocabulary to discuss topics at length; attempts paraphrase but sometimes with inappropriate word choice.").summary("Adequate vocabulary for extended discussion; some inappropriate word choice.").build(),
            RubricBand.builder().band(5).descriptor("Manages to talk about familiar/unfamiliar topics but with limited flexibility; attempts paraphrase.").summary("Limited flexibility; attempts paraphrase with some success.").build(),
            RubricBand.builder().band(4).descriptor("Able to talk about familiar topics but can only convey basic meaning; frequent word errors.").summary("Basic vocabulary for familiar topics; frequent errors.").build(),
            RubricBand.builder().band(3).descriptor("Uses simple vocabulary to convey basic personal information; vocabulary inadequate for anything beyond.").summary("Simple vocabulary for basic personal information only.").build(),
            RubricBand.builder().band(2).descriptor("Only produces isolated words or memorised phrases.").summary("Isolated words/memorised phrases only.").build(),
            RubricBand.builder().band(1).descriptor("No communication possible; no rateable language.").summary("No rateable language.").build()
        );
    }

    private List<RubricBand> buildGrammarBands() {
        return List.of(
            RubricBand.builder().band(9).descriptor("Uses a full range of structures naturally and appropriately; produces consistently accurate structures.").summary("Full range of natural, accurate structures.").build(),
            RubricBand.builder().band(8).descriptor("Uses a wide range of structures flexibly; most sentences error-free with only very occasional inaccuracies.").summary("Wide range of flexible structures; rare inaccuracies.").build(),
            RubricBand.builder().band(7).descriptor("Uses a range of complex structures with some flexibility; frequently produces error-free sentences.").summary("Good range of complex structures with flexibility; frequent error-free sentences.").build(),
            RubricBand.builder().band(6).descriptor("Uses a mix of simple and complex structures but with limited flexibility; errors occur in complex structures but rarely cause comprehension problems.").summary("Mix of simple/complex; errors in complex structures but meaning clear.").build(),
            RubricBand.builder().band(5).descriptor("Uses a limited range of structures; attempts complex structures but with errors that may cause comprehension problems.").summary("Limited range; complex structures attempted with errors affecting comprehension.").build(),
            RubricBand.builder().band(4).descriptor("Uses basic sentence forms with limited accuracy; errors are frequent and may cause comprehension difficulty.").summary("Basic forms only; frequent errors affecting comprehension.").build(),
            RubricBand.builder().band(3).descriptor("Produces basic sentence forms with frequent errors; communication often breaks down.").summary("Basic forms with frequent errors; communication breakdown.").build(),
            RubricBand.builder().band(2).descriptor("Cannot produce basic sentence forms; relies on memorised phrases.").summary("Cannot produce basic sentences; memorised phrases only.").build(),
            RubricBand.builder().band(1).descriptor("No communication possible; no rateable language.").summary("No rateable language.").build()
        );
    }

    private List<RubricBand> buildPronunciationBands() {
        return List.of(
            RubricBand.builder().band(9).descriptor("Uses a full range of pronunciation features with precision and subtlety; sustains flexible use throughout.").summary("Full range of precise, subtle pronunciation features.").build(),
            RubricBand.builder().band(8).descriptor("Uses a wide range of pronunciation features; sustains flexible use with only occasional lapses.").summary("Wide range of features; flexible with rare lapses.").build(),
            RubricBand.builder().band(7).descriptor("Uses a range of pronunciation features with mixed control; shows some sustained use of features.").summary("Good range with mixed control; sustained use of some features.").build(),
            RubricBand.builder().band(6).descriptor("Uses a range of pronunciation features with some control; uses some features effectively but not always.").summary("Some control of features; effective but inconsistent use.").build(),
            RubricBand.builder().band(5).descriptor("Shows limited range of pronunciation features; uses limited control of features; L1 influence is evident.").summary("Limited range and control; L1 influence evident.").build(),
            RubricBand.builder().band(4).descriptor("Uses limited pronunciation features; errors in individual sounds and intonation; L1 strongly influences.").summary("Very limited features; errors in sounds/intonation; strong L1 influence.").build(),
            RubricBand.builder().band(3).descriptor("Limited control of phonological features; frequent errors cause strain for listener.").summary("Limited control; frequent errors causing listener strain.").build(),
            RubricBand.builder().band(2).descriptor("Speech is often unintelligible; very limited pronunciation control.").summary("Often unintelligible; very limited control.").build(),
            RubricBand.builder().band(1).descriptor("No communication possible; no rateable language.").summary("No rateable language.").build()
        );
    }
}
