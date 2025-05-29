package werti.server.analysis;

import com.google.inject.Inject;
import com.google.inject.Provider;
import com.google.inject.name.Named;
import werti.server.servlet.ViewRequest;
import werti.uima.ConvenientCas;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-12
 */
public class HtmlDocumentAnalyser implements DocumentAnalyzer<ConvenientCas> {
    private final Provider<CasPopulator> casPopulatorProvider;
    private final UimaService uimaService;
    private Provider<ConvenientCas> casProvider;

    @Inject
    public HtmlDocumentAnalyser(
            final UimaService uimaService,
            final Provider<CasPopulator> casPopulatorProvider,
            @Named("fresh-cas") Provider<ConvenientCas> casProvider
            ) {
        this.casPopulatorProvider = casPopulatorProvider;
        this.uimaService = uimaService;
        this.casProvider = casProvider;
    }

    @Override
    public ConvenientCas analyze(final ViewRequest viewRequest)
            throws DocumentAnalysisException {

        final ConvenientCas cas = casProvider.get();
        cas.setDocumentLanguage(viewRequest.language());
        final CasPopulator casPopulator = casPopulatorProvider.get();
        casPopulator.populateCas(viewRequest.document(), cas);
        uimaService.runPipeline(cas, viewRequest);

        return cas;
    }
}
