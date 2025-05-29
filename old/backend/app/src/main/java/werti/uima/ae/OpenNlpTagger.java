package werti.uima.ae;

import opennlp.tools.postag.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.UimaContext;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.cas.text.AnnotationIndex;
import org.apache.uima.fit.component.JCasAnnotator_ImplBase;
import org.apache.uima.fit.descriptor.ExternalResource;
import org.apache.uima.jcas.JCas;
import org.apache.uima.resource.ResourceInitializationException;
import werti.Language;
import werti.resources.CachingResource;
import werti.resources.FileBackedResourceFactory;
import werti.resources.NoResourceException;
import werti.resources.ResourceLoader;
import werti.uima.types.annot.SentenceAnnotation;
import werti.uima.types.annot.Token;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.*;

/**
 * Annotator wrapper for OpenNLP tagger.
 *
 * Depends on {@link Token} and {@link SentenceAnnotation} annotation from 
 * {@link OpenNlpTokenizer} and {@link OpenNlpSentenceDetector}.
 *
 * @author Adriane Boyd
 */
public class OpenNlpTagger extends JCasAnnotator_ImplBase {
    private Map<String, POSTaggerME> taggers;
    private static final Logger log = LogManager.getLogger();

    @ExternalResource
    private FileBackedResourceFactory resourceFactory;

    // resource loader for tagger models
    private static class TaggerLoader implements ResourceLoader<POSContextGenerator, POSTaggerME> {
        private final Language language;
        private final CachingResource resource;

        private TaggerLoader(Language language, CachingResource resource) {
            this.language = language;
            this.resource = resource;
        }

        @Override
        public POSTaggerME load(POSContextGenerator context) throws NoResourceException {
            return new POSTaggerME(
                    resource.requestFromStream(
                            language,
                            resource -> {
                                try {
                                    return new POSModel(resource);
                                } catch (IOException e) {
                                    throw new NoResourceException(e);
                                }
                            },
                            POSModel.class
                    )
            );
        }
    }
    @Override
    public void initialize(UimaContext aContext)
        throws ResourceInitializationException {
        super.initialize(aContext);

        // resource loader for tag dictionaries
        final ResourceLoader<InputStream, POSDictionary> dictionaryResourceLoader = stream -> {
            try {
                return new POSDictionary(
                        new BufferedReader(new InputStreamReader (stream)), false);
            } catch (IOException e) {
                throw new NoResourceException(e);
            }
        };

        try {
            final CachingResource dictionaryResource = resourceFactory.create(
                    "opennlp.tagger.dictionary"
            );

            dictionaryResource.requestFromStream(
                    Language.ENGLISH, dictionaryResourceLoader, POSDictionary.class
            );

            taggers = new HashMap<>();
            final CachingResource resource = resourceFactory.create("opennlp.tagger");

            taggers.put("en", new TaggerLoader(Language.ENGLISH, resource).load(
                    new DefaultPOSContextGenerator(null))
            );
            taggers.put("de", new TaggerLoader(Language.GERMAN, resource).load(
                    new DefaultPOSContextGenerator(null))
            );
            taggers.put("es", new TaggerLoader(Language.SPANISH, resource).load(
                    new DefaultPOSContextGenerator(null))
            );
        } catch (NoResourceException wce) {
            throw new ResourceInitializationException(wce);
        }

    }

    @SuppressWarnings("unchecked")
    @Override
    public void process(JCas jcas) throws AnalysisEngineProcessException {
        log.debug("Starting tag annotation");

        final AnnotationIndex sentIndex = jcas.getAnnotationIndex(SentenceAnnotation.type);
        final AnnotationIndex tokenIndex = jcas.getAnnotationIndex(Token.type);

        final Iterator<SentenceAnnotation> sit = sentIndex.iterator();

        final String lang = jcas.getDocumentLanguage();

        POSTaggerME tagger;

        if (taggers.containsKey(lang)) {
            tagger = taggers.get(lang);
        } else {
            log.error("No tagger for language: " + lang);
            throw new AnalysisEngineProcessException();
        }

        while (sit.hasNext()) {
            List<Token> tokenlist = new ArrayList<>();
            List<String> tokens = new ArrayList<>();

            final Iterator<Token> tit = tokenIndex.subiterator(sit.next());

            while (tit.hasNext()) {
                final Token t = tit.next();
                tokenlist.add(t);
                tokens.add(t.getCoveredText());
            }

            List<String> tags = tagger.tag(tokens);

            for (int i = 0; i < tags.size(); i++) {
                tokenlist.get(i).setTag(tags.get(i));
            }
        }

        log.debug("Finished tag annotation");
    }
}
