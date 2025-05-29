package werti.server.modules;

import com.google.inject.AbstractModule;
import com.google.inject.Provides;
import com.google.inject.TypeLiteral;
import com.google.inject.name.Named;
import com.google.inject.name.Names;
import werti.server.analysis.DocumentAnalyzer;
import werti.server.analysis.DocumentProcessor;
import werti.server.analysis.HtmlDocumentAnalyser;
import werti.server.analysis.UimaDocumentProcessor;
import werti.server.cache.CachingDocumentAnalyzer;
import werti.server.enhancement.CasEnhancer;
import werti.server.enhancement.DocumentEnhancer;
import werti.uima.ConvenientCas;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-15
 */
public class ViewletModule extends AbstractModule {
    @Override
    protected void configure() {
        bind(DocumentProcessor.class).to(UimaDocumentProcessor.class);
        bind(new TypeLiteral<DocumentAnalyzer<ConvenientCas>>(){})
                .annotatedWith(Names.named("document-analyzer"))
                .to(HtmlDocumentAnalyser.class);
        bind(new TypeLiteral<DocumentAnalyzer<ConvenientCas>>(){})
                .annotatedWith(Names.named("caching-uima-analyzer"))
                .to(new TypeLiteral<CachingDocumentAnalyzer<ConvenientCas>>(){});
    }

    @Provides @Named("dom-enhancer")
    DocumentEnhancer<ConvenientCas> provideCasEnhancer() {
        return new CasEnhancer();
    }
}
