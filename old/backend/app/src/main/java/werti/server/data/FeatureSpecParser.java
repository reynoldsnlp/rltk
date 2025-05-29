package werti.server.data;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import org.apache.commons.lang3.tuple.ImmutablePair;
import werti.Language;

import java.util.List;
import java.util.Set;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
public class FeatureSpecParser {
    private static final List<ImmutablePair<Set<String>, String>> engines = ImmutableList.of(
            // GERMAN
            ImmutablePair.of(
                    ImmutableSet.of(
                            "language:de",
                            "mporphology:lemma:true"
                    ),
                    "fit:RfTaggerGermanLemmatiserPipeline"
            ),
            ImmutablePair.of(
                    ImmutableSet.of(
                            "language:de",
                            "morphology:pos:tiger",
                            "morphology:analysis:true"
                    ),
                    "fit:RfTaggerSimpleGermanPipeline"
            ),
            ImmutablePair.of(
                    ImmutableSet.of(
                            "language:de",
                            "morphology:lemma:true",
                            "morphology:pos:tiger",
                            "morphology:analysis:true"
                    ),
                    "fit:RfTaggerGermanPipeline"
            ),
            ImmutablePair.of(
                    ImmutableSet.of(
                            "language:de",
                            "morphology:pos:spacy",
                            "syntax:dependency:spacy"
                    ),
                    "fit:SpacyGermanPipeline"
            ),

            // ENGLISH
            ImmutablePair.of(
                    ImmutableSet.of(
                            "language:en",
                            "morphology:pos:ptb"
                    ),
                    "desc/operators/OpenNlpTaggerPipe"
            ),
            ImmutablePair.of(
                    ImmutableSet.of(
                            "language:en",
                            "morphology:pos:ptb",
                            "morphology:lemma:true"
                    ),
                    "fit:EnglishLemmatiserPipeline"
            )
    );

    private Set<String> getFeatures(final Language language, final FeatureData features) {
        final ImmutableSet.Builder<String> requestedFeatures = ImmutableSet.builder();
        requestedFeatures.add("language:" + language.toString());
        features.morphology().forEach((key, value) -> {
            if (!"false".equals(value)) { // only collect positive features
                requestedFeatures.add("morphology:" + key + ":" + value);
            }
        });
        features.syntax().forEach((key, value) -> {
            requestedFeatures.add("syntax:" + key + ":" + value);
        });
        return requestedFeatures.build();
    }

    public String match(Language language, FeatureData featureData) throws NoPipelineForFeaturesException {
        final Set<String> features = getFeatures(language, featureData);
        return engines.stream().filter(engine -> engine.left.containsAll(features))
               .findFirst().orElseThrow(() -> new NoPipelineForFeaturesException(featureData))
                .right;
    }
}
