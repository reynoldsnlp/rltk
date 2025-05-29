package werti.server.cache;

import com.google.common.cache.Cache;
import com.google.inject.Inject;
import com.google.inject.name.Named;
import werti.server.analysis.DocumentAnalysisException;
import werti.server.analysis.DocumentAnalyzer;
import werti.server.servlet.ViewRequest;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-12
 */
public class CachingDocumentAnalyzer<T> implements DocumentAnalyzer<T> {
    private final Cache<AnalysisCacheKey, T> cache;
    private final DocumentAnalyzer<T> analyzer;

    @Inject
    public CachingDocumentAnalyzer(
            @Named("topic-cache") final Cache<AnalysisCacheKey, T> cache,
            @Named("document-analyzer") final DocumentAnalyzer<T> analyzer
    ) {
        this.cache = cache;
        this.analyzer = analyzer;
    }

    @Override
    public T analyze(ViewRequest viewRequest) throws DocumentAnalysisException {
        final AnalysisCacheKey cacheKey = AnalysisCacheKey.create(
                viewRequest.document(),
                viewRequest.language(),
                viewRequest.topic()
        );

        final T cached = cache.getIfPresent(cacheKey);
        if (cached != null) {
            return cached;
        }
        final T analysisResult = analyzer.analyze(viewRequest);
        cache.put(cacheKey, analysisResult);
        return analysisResult;
    }
}
