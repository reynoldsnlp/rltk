package werti.uima.ae;

import opennlp.tools.tokenize.TokenizerME;
import opennlp.tools.tokenize.TokenizerModel;
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
import werti.uima.types.annot.Token;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Wrapper for OpenNLP tokenizer.
 *
 * @author Adriane Boyd
 * @author Aleksandar Dimitrov
 */
public class OpenNlpTokenizer extends JCasAnnotator_ImplBase {
    private static final Logger log = LogManager.getLogger();

    @ExternalResource
    private FileBackedResourceFactory resourceFactory;

    private Map<String, TokenizerME> tokenizers;

    @Override
    public void initialize(UimaContext aContext) throws ResourceInitializationException {
        super.initialize(aContext);

        try {
            tokenizers = new HashMap<>();
            final CachingResource resource = resourceFactory.create("opennlp.tokenizer");
            final ResourceLoader<Language, TokenizerME> tokenizerLoader =
                l -> new TokenizerME(resource.requestFromStream(
                        l,
                        inputStream -> {
                            try {
                                return new TokenizerModel(inputStream);
                            } catch (IOException e) {
                                throw new NoResourceException(e);
                            }
                        },
                        TokenizerModel.class)
                );

            tokenizers.put("en", tokenizerLoader.load(Language.ENGLISH));
            tokenizers.put("de", tokenizerLoader.load(Language.GERMAN));
            tokenizers.put("es", tokenizerLoader.load(Language.SPANISH));
            tokenizers.put("ru", tokenizerLoader.load(Language.RUSSIAN));            
            // since there is no Estonian tokenizer, we take the English one
            tokenizers.put("et", tokenizerLoader.load(Language.ENGLISH));
        } catch (NoResourceException wce) {
            throw new ResourceInitializationException(wce);
        }
    }

    @Override
    public void process(JCas jcas) throws AnalysisEngineProcessException {
        log.debug("Starting token annotation");

        final ConvenientCas cas = new ConvenientCas(jcas);

        final TokenizerME tokenizer;
        final String lang = jcas.getDocumentLanguage();
        if (tokenizers.containsKey(lang)) {
            tokenizer = tokenizers.get(lang);
        } else {
            throw new AnalysisEngineProcessException(
                    // AEPE doesn't have a String constructor…
                    new ViewConfigurationException("No tokenizer for language: " + lang)
            );
        }

        cas.select(BlockText.class).forEach(
                block -> tokenize(block, cas, tokenizer)
        );
        log.debug("Finished token annotation");
    }

    private void tokenize(BlockText block, ConvenientCas cas, TokenizerME tokenizer) {
        final String text = block.getCoveredText();
        final String[] tokens = tokenizer.tokenize(text);

        int skew = 0;

        for (final String token : tokens) {
            final int begin = text.indexOf(token, skew);
            final int end = begin + token.length();

            if (begin < 0)  {
                log.error("Couldn't find token '{}' in block '{}'.", token, text);
                continue;
            }

            final int blockOffset = block.getBegin();
            cas.createAnnotation(begin + blockOffset, end + blockOffset, Token.class);

            skew = end;
        }
    }
}
