package werti.uima.enhancer;

import de.tudarmstadt.ukp.dkpro.core.api.segmentation.type.Sentence;
import werti.server.data.ViewConfigurationException;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.SentenceEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.SentenceAnnotation;

import java.util.ArrayList;
import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-14
 */
public class SentenceEnhancementsGenerator implements EnhancementGenerator {
    @Override
    public List<Enhancement> enhance(ConvenientCas cas) throws ViewConfigurationException {
        final List<Enhancement> enhancements = new ArrayList<>();

        cas.select(SentenceAnnotation.class).forEach(
                sentenceAnnotation -> {
                    final SentenceEnhancement enhancement =
                            new SentenceEnhancement(sentenceAnnotation);
                    if (sentenceAnnotation.getIsBasedOnBlock()) {
                        enhancement.addAttribute("isBasedOnBlock", "true");
                    }
                    enhancements.add(enhancement);
                }
        );

        cas.select(Sentence.class).forEach(
                sentence -> {
                    final SentenceEnhancement enhancement =
                            new SentenceEnhancement(sentence);
                    enhancements.add(enhancement);
                }
        );

        return enhancements;
    }
}
