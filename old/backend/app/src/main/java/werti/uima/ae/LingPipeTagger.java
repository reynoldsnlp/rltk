package werti.uima.ae;

import com.aliasi.hmm.HiddenMarkovModel;
import com.aliasi.hmm.HmmDecoder;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.UimaContext;
import org.apache.uima.cas.text.AnnotationIndex;
import org.apache.uima.fit.component.JCasAnnotator_ImplBase;
import org.apache.uima.fit.descriptor.ExternalResource;
import org.apache.uima.jcas.JCas;
import org.apache.uima.jcas.tcas.Annotation;
import org.apache.uima.resource.ResourceInitializationException;
import werti.resources.CachingResource;
import werti.resources.FileBackedResourceFactory;
import werti.resources.NoResourceException;
import werti.uima.types.annot.SentenceAnnotation;
import werti.uima.types.annot.Token;
import werti.util.CasUtils;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;

import static werti.Language.ENGLISH;

/**
 * A wrapper around the LingPipe Tagger.
 *
 * It retrieves a Hidden Markov model tagger from the <tt>WERTiContext</tt> and
 * then iterates over all sentences and tags all their token annotations.
 *
 * This is currently the standard tagger, but supports only English.
 *
 * @author Aleksandar Dimitrov
 * @version 0.1
 */
public class LingPipeTagger extends JCasAnnotator_ImplBase {
    private static final Logger log = LogManager.getLogger();

    @ExternalResource
    private FileBackedResourceFactory resourceFactory;

    // the average length of a sentence (for performance reasons, this denotes our
    // dynamic data structure's initial capacity)
    private static final int SENTENCE_LENGTH = 30;

    private HmmDecoder tagger;

    @Override
    public void initialize(UimaContext context) throws ResourceInitializationException {
        super.initialize(context);
        log.debug("Initializing LingPipeTagger for " + ENGLISH);
        try {
            final CachingResource resource =
                    resourceFactory.create("lingpipe.tagger");
            tagger = resource.request(
                    ENGLISH,
                    object -> new HmmDecoder((HiddenMarkovModel) object),
                    HmmDecoder.class
            );
        } catch (NoResourceException e) {
            throw new ResourceInitializationException(e);
        }
    }

    /**
     * Tag using the lingPipe <code>HmmDecoder</code>.
     *
     * We have to make a three pass, as usual, since the HmmDecoder just gives strings
     * and also expects to find a static String[].
     *
     * @param cas The CAS with token and sentence annotations.
     */
    @Override
    @SuppressWarnings("unchecked")
    public void process(JCas cas) {
        // stop processing if the client has requested it
        if (!CasUtils.isValid(cas)) {
            return;
        }

        log.debug("Starting tagging");

        // don't forget to .clear() the list on every new sentence.
        final List<Token> tlist = new ArrayList<>(SENTENCE_LENGTH);

        final AnnotationIndex sindex = cas.getAnnotationIndex(SentenceAnnotation.type);
        final AnnotationIndex tindex = cas.getAnnotationIndex(Token.type);

        for (SentenceAnnotation aSindex : (Iterable<SentenceAnnotation>) sindex) {
            final Iterator<Token> tit = tindex.subiterator(aSindex);
            while (tit.hasNext()) {
                final Token t = tit.next();
                // The LingPipe tagger incorrectly marks compound dashes,
                // like in mother-daughter as prepositions.
                // Still needed as of September 2016. See ticket #126
                if (!t.getCoveredText().equals("-")) {
                       tlist.add(t);
                }
            }

            final List<String> words = tlist.stream()
                    .map(Annotation::getCoveredText)
                    .collect(Collectors.toList());

            final List<String> tags = tagger.tag(words).tags();
            assert words.size() == tags.size();

            for (int ii = 0; ii < tags.size(); ii++) {
                tlist.get(ii).setTag(tags.get(ii));
                if (log.isDebugEnabled()) {
                    if (!words.get(ii).equals(tlist.get(ii).getCoveredText())) {
                        log.warn("Mismatching word fields: words = "
                                + words.get(ii)
                                + "; tlist = " + tlist.get(ii).getCoveredText());
                    }
                    if (log.isTraceEnabled()) {
                        log.trace("Tagging " + words.get(ii) + " with " + tags.get(ii) + ".");
                    }
                }
                // Do NOT even THINK ABOUT calling addToIndexes(). The Tokens are already
                // there. We just modified their field 'tag'.
            }
            tlist.clear();
        }
        log.debug("Finished tagging");
    }
}
