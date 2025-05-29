package werti.uima.enhancer;

import com.google.common.collect.ImmutableList;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.UimaContext;
import org.apache.uima.analysis_component.JCasAnnotator_ImplBase;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.jcas.JCas;
import org.apache.uima.resource.ResourceInitializationException;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.types.EnhancementAnnotation;
import werti.uima.types.annot.Token;

import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * An enhancement class that puts <tt>{@link EnhancementAnnotation}</tt>s on
 * <tt>{@link Token}</tt>s according to its filter settings.
 *
 * @author Aleksandar Dimitrov
 * @author Adriane Boyd
 * @version 0.2
 */

public class TokenEnhancer extends JCasAnnotator_ImplBase {
    private static final Logger log = LogManager.getLogger();
    private final Predicate<Token> noPunctuation =
            token -> token.getCoveredText().matches(".*[^\\p{P}].*");
    private Predicate<Token> filter;
    private String data = null;

    @Override
    public void initialize(UimaContext context)
            throws ResourceInitializationException {
        super.initialize(context);

        filter = noPunctuation
                .and(readFilter(context, "partOfSpeech", Token::getTag))
                .and(readFilter(context, "lemma", Token::getLemma))
                .and(readFilter(context, "coveredText", Token::getCoveredText));

        final String distractorsParameter =
                (String) context.getConfigParameterValue("distractors");

        // we set up a dummy enhancement to compute the data fields for the added annotations
        // (all annotations have the same data fields for this simple enhancer)
        final ViewEnhancement dummyEnhancement = new ViewEnhancement(0, 0);
        dummyEnhancement.addAttribute("type", "hit");
        if (distractorsParameter != null) {
            dummyEnhancement.addAttribute("distractors", distractorsParameter);
        }
        data = dummyEnhancement.getData();
    }

    private Predicate<Token> readFilter(
            final UimaContext context,
            final String key,
            Function<Token, String> getter
    ) {
        final String configParameterValue = (String) context.getConfigParameterValue(key);

        if (configParameterValue == null) {
            return any -> true;
        }

        final List<String> values = ImmutableList.copyOf(configParameterValue.split(";"));

        return token -> Optional.ofNullable(getter.apply(token)).map(String::toLowerCase)
                                .map(values::contains).orElse(false);
    }

    @Override
    public void process(final JCas jcas) throws AnalysisEngineProcessException {
        log.debug("Starting enhancement");

        final ConvenientCas cas = new ConvenientCas(jcas);
        cas.select(Token.class)
           .stream().filter(filter)
           .forEach(token -> cas.createAnnotation(token, EnhancementAnnotation.class)
                                .setData(data));

        log.debug("Finished enhancement");
    }
}
