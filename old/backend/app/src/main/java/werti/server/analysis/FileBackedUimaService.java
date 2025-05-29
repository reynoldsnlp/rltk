package werti.server.analysis;

import com.google.common.collect.ImmutableMap;
import com.google.inject.Inject;
import org.apache.uima.UIMAFramework;
import org.apache.uima.analysis_engine.AnalysisEngine;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.resource.ResourceInitializationException;
import werti.ViewContext;
import werti.resources.FileBackedResourceFactory;
import werti.resources.SimpleNamedResourceManager;
import werti.uima.ConvenientCas;
import werti.uima.ae.util.SpacyApi;

import static org.apache.uima.fit.factory.ExternalResourceFactory.bindExternalResource;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-08
 */
public class FileBackedUimaService implements UimaService {
    private final FileBackedResourceFactory resourceFactory;
    private final ViewContext viewContext;
    private final SpacyApi spacyApi;
    public static final String RESOURCE_FACTORY = "resourceFactory";
    public static final String VIEW_CONTEXT = "viewContext";
    public static final String SPACY_API = "spacyApi";

    @Inject
    public FileBackedUimaService(
            final FileBackedResourceFactory resourceFactory,
            final ViewContext viewContext,
            final SpacyApi spacyApi
    ) {
        this.resourceFactory = resourceFactory;
        this.viewContext = viewContext;
        this.spacyApi = spacyApi;
    }

    AnalysisEngine configureEngine(final AnalysisEngineDescription description) throws ResourceInitializationException {
        SimpleNamedResourceManager uimaResources = new SimpleNamedResourceManager();
        uimaResources.setAutoWireEnabled(true);
        uimaResources.setExternalContext(
                ImmutableMap.of(
                        RESOURCE_FACTORY, resourceFactory,
                        VIEW_CONTEXT, viewContext,
                        SPACY_API, spacyApi
                )
        );

        bindExternalResource(description, RESOURCE_FACTORY, RESOURCE_FACTORY);
        bindExternalResource(description, VIEW_CONTEXT, VIEW_CONTEXT);
        bindExternalResource(description, SPACY_API, SPACY_API);
        return UIMAFramework.produceAnalysisEngine(
                description,
                uimaResources,
                null
        );
    }

    @Override
    public void runPipeline(ConvenientCas cas, AnalysisEngineDescription analysisEngineDescription)
            throws DocumentAnalysisException {
        try {
            final AnalysisEngine analysisEngine = configureEngine(analysisEngineDescription);
            cas.applyEngine(analysisEngine);
        } catch ( AnalysisEngineProcessException
                | ResourceInitializationException
                e ) {
            throw new DocumentAnalysisException(e);
        }
    }
}
