package werti.server.analysis;

import com.google.inject.Inject;
import com.google.inject.Provider;
import com.google.inject.name.Named;
import org.jsoup.nodes.Document;
import werti.server.data.ViewConfigurationException;
import werti.server.enhancement.DocumentEnhancer;
import werti.server.enhancement.Enhancement;
import werti.server.servlet.ViewRequest;
import werti.uima.ConvenientCas;
import werti.uima.enhancer.EnhancementGenerator;
import werti.uima.enhancer.SentenceEnhancementsGenerator;

import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-12
 */
public class UimaDocumentProcessor implements DocumentProcessor {
    private final DocumentAnalyzer<ConvenientCas> analyzer;
    private final Provider<DocumentEnhancer<ConvenientCas>> enhancerProvider;
    private final SentenceEnhancementsGenerator sentenceEnhancementsGenerator;

    @Inject
    public UimaDocumentProcessor(
            @Named("caching-uima-analyzer") DocumentAnalyzer<ConvenientCas> analyzer,
            @Named("dom-enhancer") Provider<DocumentEnhancer<ConvenientCas>> enhancerProvider,
            SentenceEnhancementsGenerator sentenceEnhancementsGenerator
    ) {
        this.analyzer = analyzer;
        this.enhancerProvider = enhancerProvider;
        this.sentenceEnhancementsGenerator = sentenceEnhancementsGenerator;
    }

    private ConvenientCas analyze(ViewRequest viewRequest) throws DocumentProcessingException {
        try {
            return analyzer.analyze(viewRequest);
        } catch (DocumentAnalysisException e) {
            throw new DocumentProcessingException(e);
        }
    }

    private List<Enhancement> getEnhancements(ConvenientCas cas, ViewRequest viewRequest)
            throws DocumentProcessingException {
        try {
            final EnhancementGenerator generator =
                    viewRequest.activity().enhancementDescription().getEnhancementGenerator();
            final List<Enhancement> enhancements =
                    sentenceEnhancementsGenerator.enhance(cas);
            enhancements.addAll(generator.enhance(cas));
            return enhancements;
        } catch (ViewConfigurationException e) {
            throw new DocumentProcessingException(e);
        }
    }

    @Override
    public Document process(ViewRequest viewRequest) throws DocumentProcessingException {
        final ConvenientCas cas = analyze(viewRequest);
        final List<Enhancement> enhancements = getEnhancements(cas, viewRequest);
        final Document output = viewRequest.document().clone();
        output.outputSettings(output.outputSettings().prettyPrint(false));
        final DocumentEnhancer<ConvenientCas> enhancer = enhancerProvider.get();
        return enhancer.enhance(cas, output, enhancements);
    }
}
