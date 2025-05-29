package werti.uima.enhancer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.server.data.ViewConfigurationException;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.Token;

import java.util.*;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-14
 */
public class EnhancementsAndTokens implements EnhancementGenerator {
    private static final Logger log = LogManager.getLogger();
    private final Map<String, String> configuration;

    public EnhancementsAndTokens(Map<String, String> configuration) {
        this.configuration = configuration;
    }

    @Override
    public List<Enhancement> enhance(ConvenientCas cas) throws ViewConfigurationException {
        final Enhancements enhancementGenerator = new Enhancements(configuration);
        final BitSet coveredByEnhancements = new BitSet(cas.getDocumentText().length());

        // get enhancements from the standard enhancement generator
        final List<Enhancement> enhancements;
        try {
            enhancements = enhancementGenerator.enhance(cas);
        } catch (ViewConfigurationException e) {
            log.warn("Couldn't get enhancements.", e);
            return new ArrayList<>();
        }

        // mark all starting positions of enhancements (Tokens can't be overlapping)
        // Note that this approach will not work for multi-token Enhancements. See #214
        enhancements.forEach(annotation -> coveredByEnhancements.set(annotation.getSpan().begin()));

        // Add token enhancements where there wasn't already an enhancement (of any type before)
        cas.select(Token.class).forEach(token -> {
            // we only add a token enhancement if there wasn't already an enhancement
            // annotation in the same position
            if (!coveredByEnhancements.get(token.getBegin())) {
                enhancements.add(new ViewEnhancement(token).addAttribute("type", "miss"));
            }
        });
        return enhancements;
    }
}
