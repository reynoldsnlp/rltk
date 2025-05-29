package werti.uima.ae;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.fit.component.JCasAnnotator_ImplBase;
import org.apache.uima.fit.descriptor.ExternalResource;
import org.apache.uima.jcas.JCas;
import werti.Language;
import werti.uima.ConvenientCas;
import werti.uima.UnsupportedLanguageException;
import werti.uima.ae.util.*;
import werti.uima.types.annot.BlockText;
import werti.uima.types.annot.Token;

import java.util.Collection;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-10
 */
public class SpacyRestAnnotator extends JCasAnnotator_ImplBase {
    private static final Logger log = LogManager.getLogger();

    @ExternalResource
    private SpacyApi spacyApi;

    @Override
    public void process(JCas jCas) throws AnalysisEngineProcessException {
        log.debug("Starting spaCy analysis");
        final String documentText = jCas.getDocumentText();
        final ConvenientCas cas = new ConvenientCas(jCas);
        final Language language;
        try {
            language = cas.getDocumentLanguage();
        } catch (UnsupportedLanguageException e) {
            throw new AnalysisEngineProcessException(e);
        }

        try {
            final Collection<BlockText> blocks = cas.select(BlockText.class);
            for (BlockText block: blocks) {
                log.debug("Requesting analysis from server.");
                analyse(block, cas, language);
                log.debug("Response received");
            }
        } catch (SpacyException e) {
            throw new AnalysisEngineProcessException(e);
        }
        log.debug("Finished spaCy analysis");
    }

    private void analyse(final BlockText block, final ConvenientCas cas, final Language language) throws SpacyException {
        final String text = block.getCoveredText();
        final SpacyResult analysis = spacyApi.getAnalysisFor(language, text);
        final Token[] tokens = new Token[analysis.words().size()];

        int offset = 0;
        int position = 0;

        for (final SpacyToken word: analysis.words()) {
            final String coveredText = word.text();
            final int begin = text.indexOf(coveredText, offset);
            final int end = begin + coveredText.length();

            if (begin < 0) {
                log.error("Couldn't find token '{}' in block '{}'.", coveredText, text);
            }

            final int blockOffset = block.getBegin();
            final Token token = cas.createAnnotation(
                    begin + blockOffset,
                    end + blockOffset,
                    Token.class
            );

            token.setTag(word.tag());

            tokens[position++] = token;
            token.setDepid(begin + blockOffset);
            offset = end;
        }

        for (final SpacyArc arc: analysis.arcs()) {
            final Token dependent;
            final Token head;
            if (arc.direction().equals("left")) {
                dependent = tokens[arc.start()];
                head = tokens[arc.end()];
            } else {
                dependent = tokens[arc.end()];
                head = tokens[arc.start()];
            }
            dependent.setRelation(arc.label());
            dependent.setHead(head);
        }
    }
}
