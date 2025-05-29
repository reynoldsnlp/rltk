package werti.uima.ae;

import opennlp.tools.sentdetect.SentenceDetectorME;
import opennlp.tools.sentdetect.SentenceModel;
import opennlp.tools.util.Span;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.UimaContext;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.fit.component.JCasAnnotator_ImplBase;
import org.apache.uima.fit.descriptor.ExternalResource;
import org.apache.uima.jcas.JCas;
import org.apache.uima.resource.ResourceInitializationException;
import werti.Language;
import werti.resources.CachingResource;
import werti.resources.FileBackedResourceFactory;
import werti.resources.NoResourceException;
import werti.resources.ResourceLoader;
import werti.server.data.ViewConfigurationException;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.BlockText;
import werti.uima.types.annot.SentenceAnnotation;
import werti.uima.types.annot.Token;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import static java.lang.Character.isWhitespace;

/**
 * Wrapper for OpenNLP sentence detector.
 *
 * Depends on {@link Token} Token annotation from {@link OpenNlpTokenizer}.
 *
 * @author Adriane Boyd
 * @author Aleksandar Dimitrov
 */
public class OpenNlpSentenceDetector extends JCasAnnotator_ImplBase {
    private static final Logger log = LogManager.getLogger();
    private Map<String, SentenceDetectorME> detectors;

    @ExternalResource
    private FileBackedResourceFactory resourceFactory;

    private void loadGreedily() throws NoResourceException {
        detectors = new HashMap<>();
        final CachingResource resource = resourceFactory.create("opennlp.sbd");
        final ResourceLoader<Language, SentenceDetectorME> sbdLoader =
                l -> new SentenceDetectorME(resource.requestFromStream(
                        l,
                        inputStream -> {
                            try {
                                return new SentenceModel(inputStream);
                            } catch (IOException e) {
                                throw new NoResourceException(e);
                            }
                        },
                        SentenceModel.class
                ));

        detectors.put("en", sbdLoader.load(Language.ENGLISH));
        detectors.put("es", sbdLoader.load(Language.GERMAN));
        detectors.put("de", sbdLoader.load(Language.SPANISH));
        detectors.put("ru", sbdLoader.load(Language.RUSSIAN));
        // since there is no Estonian sentence detector, we take the English one
        detectors.put("et", sbdLoader.load(Language.ENGLISH));
    }

    @Override
    public void initialize(UimaContext aContext)
            throws ResourceInitializationException {
        super.initialize(aContext);

        try {
            loadGreedily();
        } catch (NoResourceException e) {
            throw new ResourceInitializationException(e);
        }
    }

    @Override
    public void process(JCas jcas) throws AnalysisEngineProcessException {
        log.debug("Starting sentence detection");

        final String lang = jcas.getDocumentLanguage();
        SentenceDetectorME detector;

        if (detectors.containsKey(lang)) {
            detector = detectors.get(lang);
        } else {
            throw new AnalysisEngineProcessException(
                    new ViewConfigurationException("No tokenizer for language: " + lang)
            );
        }

        final ConvenientCas cas = new ConvenientCas(jcas);
        cas.select(BlockText.class).forEach(
                block -> detect(block, cas, detector)
        );

        log.debug("Finished sentence detection");
    }

    private void detect(
            BlockText blockText,
            ConvenientCas cas,
            SentenceDetectorME detector
    ) {
        final String text = blockText.getCoveredText();
        final Span[] sentenceSpans = detector.sentPosDetect(text);

        if (sentenceSpans.length == 0) {
            // No sentences were detected, we just assume a sentence on the block element.
            cas.createAnnotation(blockText.getBegin(), blockText.getEnd(), SentenceAnnotation .class);
        } else {
            final int blockStart = blockText.getBegin();

            for (final Span sentenceSpan : sentenceSpans) {
                int strippedSentenceEnd = sentenceSpan.getEnd();

                while (isWhitespace(text.charAt(strippedSentenceEnd - 1))) {
                    strippedSentenceEnd--;
                }

                cas.createAnnotation(
                        blockStart + sentenceSpan.getStart(),
                        blockStart + strippedSentenceEnd,
                        SentenceAnnotation.class
                );
            }
        }
    }
}
